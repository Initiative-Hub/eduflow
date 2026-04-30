import type { UIMessage } from 'ai';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { ChatProviderFactory } from '@/services/ai/ChatProviderFactory';
import { DEFAULT_PROVIDER } from '@/services/ai/chat-provider.constants';
import type {
  ChatProvider,
  StreamChatInput,
} from '@/services/ai/chat-provider.types';
import { CacheService } from '@/services/CacheService';
import type { ChatCacheData } from '@/utils/chat-session';

export const maxDuration = 30;

const chatRequestSchema = z.object({
  messages: z.array(z.custom<UIMessage>()).min(1),
  provider: z.custom<ChatProvider>().optional(),
  model: z.string().min(1).optional(),
  apiKey: z.string().min(1).optional(),
  providerOptions: z.custom<StreamChatInput['providerOptions']>().optional(),
});

const getOwnedChat = async (chatId: string, guestId: string) => {
  const rawChatData = await CacheService.getCache<
    Partial<ChatCacheData> & Pick<ChatCacheData, 'guestId' | 'title'>
  >(chatId);

  if (!rawChatData) {
    return {
      status: 404 as const,
      response: new Response(JSON.stringify({ error: 'Chat not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }

  if (rawChatData.guestId !== guestId) {
    return {
      status: 403 as const,
      response: new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }

  const chatData: ChatCacheData = {
    guestId: rawChatData.guestId,
    title: rawChatData.title,
    messageCount: rawChatData.messageCount ?? 0,
    messages: rawChatData.messages ?? [],
  };

  return { status: 200 as const, chatData };
};

/**
 * @swagger
 * /api/chat/{chatId}:
 *   get:
 *     tags:
 *       - Chat
 *     summary: Get chat metadata and messages for an existing chat
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chat data
 *       401:
 *         description: Missing guest session
 *       403:
 *         description: Access denied
 *       404:
 *         description: Chat not found
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await params;

    const cookieStore = await cookies();
    const guestSession = cookieStore.get('guest_session');
    const guestId = guestSession?.value;

    if (!guestId) {
      return new Response(JSON.stringify({ error: 'Missing guest session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const chatLookup = await getOwnedChat(chatId, guestId);
    if (chatLookup.status !== 200) {
      return chatLookup.response;
    }

    return new Response(JSON.stringify(chatLookup.chatData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * @swagger
 * /api/chat/{chatId}:
 *   post:
 *     tags:
 *       - Chat
 *     summary: Send a message to an existing chat and receive a streamed response
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
 *             properties:
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
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
 *       401:
 *         description: Missing guest session
 *       403:
 *         description: Access denied
 *       404:
 *         description: Chat not found
 *       429:
 *         description: Guest limit reached
 *
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const [{ chatId }, body] = await Promise.all([params, req.json()]);

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
    const guestSession = cookieStore.get('guest_session');
    const guestId = guestSession?.value;

    if (!guestId) {
      return new Response(JSON.stringify({ error: 'Missing guest session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const limitStatus = await CacheService.checkGuestLimit(guestId);
    if (!limitStatus.allowed) {
      return new Response(
        JSON.stringify({
          error: limitStatus.message,
          remaining: limitStatus.remaining,
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const chatLookup = await getOwnedChat(chatId, guestId);
    if (chatLookup.status !== 200) {
      return chatLookup.response;
    }

    const provider = ChatProviderFactory.create(
      parsedBody.data.provider ?? DEFAULT_PROVIDER
    );

    const result = await provider.streamChat(
      parsedBody.data as StreamChatInput
    );

    const response = result.toUIMessageStreamResponse({
      originalMessages: parsedBody.data.messages,
      onFinish: async ({ messages }) => {
        await CacheService.setCache(
          chatId,
          {
            ...chatLookup.chatData,
            messages,
            messageCount: messages.length,
          },
          { ttlSeconds: 86400 }
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
