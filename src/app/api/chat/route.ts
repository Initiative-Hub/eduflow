import { z } from 'zod';
import { ChatProviderFactory } from '@/services/ai/ChatProviderFactory';
import { DEFAULT_PROVIDER } from '@/services/ai/chat-provider.constants';
import type {
  ChatProvider,
  StreamChatInput,
} from '@/services/ai/chat-provider.types';

/**
 * @swagger
 * /api/chat:
 *   post:
 *     tags:
 *       - Chat
 *     summary: Send a message to the AI and receive a streamed response
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum: [user, assistant, system]
 *                     parts:
 *                       type: array
 *                       items:
 *                         type: any
 *               provider:
 *                 type: string
 *                 enum: [ai-gateway, google, openrouter]
 *                 default: ai-gateway
 *               model:
 *                 type: string
 *               apiKey:
 *                 type: string
 *               providerOptions:
 *                 type: object
 *     responses:
 *       200:
 *         description: Streamed AI response
 *       400:
 *         description: Invalid request payload
 *       500:
 *         description: Server error
 */
export const maxDuration = 30;

const chatRequestSchema = z.object({
  messages: z.array(z.custom()).min(1),
  provider: z.custom<ChatProvider>().optional(),
  model: z.string().min(1).optional(),
  apiKey: z.string().min(1).optional(),
  providerOptions: z.custom<StreamChatInput['providerOptions']>().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsedBody = chatRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request payload',
          details: parsedBody.error.flatten(),
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const provider = ChatProviderFactory.create(
      parsedBody.data.provider ?? DEFAULT_PROVIDER
    );

    const result = await provider.streamChat(
      parsedBody.data as StreamChatInput
    );

    return result.toUIMessageStreamResponse();
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
