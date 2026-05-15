import type { UIMessage } from 'ai';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { writingToolSchema } from '@/lib/validations/writing.schema';
import { ChatProviderFactory } from '@/services/ai/ChatProviderFactory';
import { DEFAULT_PROVIDER } from '@/services/ai/chat-provider.constants';
import type {
  ChatProvider,
  StreamChatInput,
} from '@/services/ai/chat-provider.types';
import { CacheService } from '@/services/CacheService';
import type { ChatCacheData } from '@/utils/chat-session';
import { getWritingSystemPrompt } from './writing.constants';

export const maxDuration = 30;

const writingRequestSchema = z.object({
  messages: z.array(z.custom<UIMessage>()).min(1),
  tool: writingToolSchema,
  provider: z.custom<ChatProvider>().optional(),
  model: z.string().min(1).optional(),
  apiKey: z.string().min(1).optional(),
  providerOptions: z.custom<StreamChatInput['providerOptions']>().optional(),
});

/**
 * @swagger
 * /api/v1/ai/writing/{chatId}:
 *   post:
 *     tags:
 *       - Writing
 *     summary: Send a writing prompt and receive a streamed response
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Streamed writing response
 *       400:
 *         description: Invalid request payload
 *       401:
 *         description: Missing guest session
 *       404:
 *         description: Session not found
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const [{ chatId }, body] = await Promise.all([params, req.json()]);

    const parsedBody = writingRequestSchema.safeParse(body);
    if (!parsedBody.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request payload',
          details: parsedBody.error.flatten(),
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const cookieStore = await cookies();
    const guestId = cookieStore.get('guest_session')?.value;

    if (!guestId) {
      return new Response(JSON.stringify({ error: 'Missing guest session' }), {
        status: 401,
      });
    }

    const writingData = await CacheService.getCache<ChatCacheData>(chatId);

    if (!writingData || writingData.guestId !== guestId) {
      return new Response(
        JSON.stringify({ error: 'Session not found or access denied' }),
        {
          status: 404,
        }
      );
    }

    const writingTool = parsedBody.data.tool;
    const systemPrompt = getWritingSystemPrompt(writingTool);

    const provider = ChatProviderFactory.create(
      parsedBody.data.provider ?? DEFAULT_PROVIDER
    );

    const result = await provider.streamChat({
      ...(parsedBody.data as StreamChatInput),
      system: systemPrompt,
    });

    const response = result.toUIMessageStreamResponse({
      originalMessages: parsedBody.data.messages,
      onFinish: async ({ messages }) => {
        await CacheService.setCache(
          chatId,
          {
            ...writingData,
            messages,
            messageCount: messages.length,
          },
          {
            ttlSeconds: 86400,
          }
        );
      },
    });

    return response;
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
