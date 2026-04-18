import { cookies } from 'next/headers';
import { z } from 'zod';
import { ChatProviderFactory } from '@/services/ai/ChatProviderFactory';
import { DEFAULT_PROVIDER } from '@/services/ai/chat-provider.constants';
import type {
  ChatProvider,
  StreamChatInput,
} from '@/services/ai/chat-provider.types';
import { CacheService } from '@/services/CacheService';
import { buildNewChatData } from '@/services/chat/chat-session';
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
 *               chatId:
 *                 type: string
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
  chatId: z.string().min(1).optional(),
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
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const cookieStore = await cookies();
    let guestSession = cookieStore.get('guest_session');
    let guestId = guestSession?.value;

    if (!guestId) {
      guestId = `guest_${crypto.randomUUID()}`;
      cookieStore.set('guest_session', guestId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24,
        path: '/',
      });
      guestSession = cookieStore.get('guest_session');
    }

    const limitStatus = await CacheService.checkGuestLimit(guestId);

    if (!limitStatus.allowed) {
      return new Response(
        JSON.stringify({
          error: limitStatus.message,
          remaining: limitStatus.remaining,
        }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    let isNewChat = !parsedBody.data.chatId;
    const chatId = parsedBody.data.chatId || `chat_${crypto.randomUUID()}`;

    let chatData: any;

    if (!isNewChat) {
      chatData = await CacheService.getCache<any>(chatId);
    }

    if (!chatData) {
      const firstMessage = parsedBody.data.messages[0] as {
        parts?: Array<{ type?: string; text?: string }>;
        content?: string;
      };
      isNewChat = true;
      chatData = buildNewChatData({
        guestId,
        firstMessage: firstMessage.content ?? '',
      });
      chatData.messageCount = parsedBody.data.messages.length;
    } else {
      if (chatData.guestId !== guestId) {
        return new Response(JSON.stringify({ error: 'Access denied' }), {
          status: 403,
        });
      }

      chatData.messageCount =
        (chatData.messageCount ?? 0) + parsedBody.data.messages.length;
    }

    await CacheService.setCache(chatId, chatData, { ttlSeconds: 86400 });

    const provider = ChatProviderFactory.create(
      parsedBody.data.provider ?? DEFAULT_PROVIDER
    );

    const { chatId: _chatId, ...chatInput } = parsedBody.data;

    const result = await provider.streamChat(chatInput as StreamChatInput);

    const response = result.toUIMessageStreamResponse();

    if (isNewChat) {
      response.headers.set('X-Chat-Id', chatId);
    }

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
