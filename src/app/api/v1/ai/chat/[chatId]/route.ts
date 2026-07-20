import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  toUIMessageStream,
  type UIMessage,
} from 'ai';
import { z } from 'zod';
import { getChatOwner } from '@/lib/api/guest-session';
import { ChatProviderFactory } from '@/services/ai/ChatProviderFactory';
import { CHAT_MODEL_IDS } from '@/services/ai/chat-models';
import { DEFAULT_PROVIDER } from '@/services/ai/chat-provider.constants';
import type { ChatProvider } from '@/services/ai/chat-provider.types';
import { createChatTools } from '@/services/ai/chat-tools';
import { CacheService } from '@/services/CacheService';
import { ChatPersistenceService } from '@/services/ChatPersistenceService';
import {
  hasChatFileParts,
  hydrateChatAttachmentDataUrls,
} from '@/utils/chat-attachments';
import {
  hasChatLessonReferenceParts,
  hydrateChatLessonReferenceContent,
} from '@/utils/chat-lesson-references';
import {
  generateAiChatSuggestions,
  getAiChatSystemPrompt,
} from './chat.constants';

const chatRequestSchema = z.object({
  message: z.custom<UIMessage>(),
  provider: z.custom<ChatProvider>().optional(),
  model: z.enum(CHAT_MODEL_IDS).optional(),
  apiKey: z.string().min(1).optional(),
});

const chatUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    deleted_at: z.string().datetime().optional(),
  })
  .refine((data) => data.title !== undefined || data.deleted_at !== undefined, {
    message: 'Provide title or deleted_at',
  });

const chatHistoryQuerySchema = z.object({
  before: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(20).default(5),
});

/**
 * @swagger
 * /api/v1/ai/chat/{chatId}:
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
  req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await params;
    const parsedQuery = chatHistoryQuerySchema.safeParse(
      Object.fromEntries(new URL(req.url).searchParams.entries())
    );

    if (!parsedQuery.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request query',
          details: parsedQuery.error.flatten(),
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { userId, guestId } = await getChatOwner();

    if (!userId && !guestId) {
      return new Response(JSON.stringify({ error: 'Missing guest session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const chatData = await ChatPersistenceService.getChatMessagesPage({
      chatId,
      userId,
      guestId,
      limit: parsedQuery.data.limit,
      beforeMessageId: parsedQuery.data.before,
    });

    if (!chatData) {
      return new Response(JSON.stringify({ error: 'Chat not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(chatData), {
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
 * /api/v1/ai/chat/{chatId}:
 *   patch:
 *     tags:
 *       - Chat
 *     summary: Update chat title or soft delete a chat
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
 *               title:
 *                 type: string
 *               deleted_at:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Updated chat metadata
 *       400:
 *         description: Invalid request payload
 *       401:
 *         description: Missing guest session
 *       404:
 *         description: Chat not found
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const [{ chatId }, body] = await Promise.all([params, req.json()]);

    const parsedBody = chatUpdateSchema.safeParse(body);
    if (!parsedBody.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request payload',
          details: parsedBody.error.flatten(),
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { userId, guestId } = await getChatOwner();

    if (!userId && !guestId) {
      return new Response(JSON.stringify({ error: 'Missing guest session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const updatedChat = await ChatPersistenceService.updateChat({
      chatId,
      userId,
      guestId,
      title: parsedBody.data.title,
      deletedAt: parsedBody.data.deleted_at
        ? new Date(parsedBody.data.deleted_at)
        : undefined,
    });

    if (!updatedChat) {
      return new Response(JSON.stringify({ error: 'Chat not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(updatedChat), {
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
 * /api/v1/ai/chat/{chatId}:
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

    const { userId, guestId } = await getChatOwner();

    if (!userId && !guestId) {
      return new Response(JSON.stringify({ error: 'Missing guest session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const limitStatus = userId
      ? { allowed: true, remaining: Number.POSITIVE_INFINITY, message: '' }
      : await CacheService.checkGuestLimit(guestId as string);
    if (!limitStatus.allowed) {
      return new Response(
        JSON.stringify({
          error: limitStatus.message,
          remaining: limitStatus.remaining,
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const chatData = await ChatPersistenceService.getChat({
      chatId,
      userId,
      guestId,
    });

    if (!chatData) {
      return new Response(JSON.stringify({ error: 'Chat not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const messagesForRequest = [...chatData.messages, parsedBody.data.message];
    const hasFileParts = hasChatFileParts(messagesForRequest);
    const hasLessonReferences = hasChatLessonReferenceParts(messagesForRequest);
    if (hasFileParts && !userId) {
      return new Response(
        JSON.stringify({ error: 'File attachments require sign-in' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (hasLessonReferences && !userId) {
      return new Response(
        JSON.stringify({ error: 'Lesson references require sign-in' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let messagesForModel = messagesForRequest;
    if (hasFileParts && userId) {
      try {
        messagesForModel = await hydrateChatAttachmentDataUrls({
          messages: messagesForModel,
          userId,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'File attachment not found';
        return new Response(JSON.stringify({ error: message }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    if (hasLessonReferences && userId) {
      try {
        messagesForModel = await hydrateChatLessonReferenceContent({
          messages: messagesForModel,
          userId,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Lesson reference not found';
        return new Response(JSON.stringify({ error: message }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    const providerName = parsedBody.data.provider ?? DEFAULT_PROVIDER;
    const provider = ChatProviderFactory.create(providerName);
    const systemPrompt = getAiChatSystemPrompt();
    const chatTools = createChatTools(userId);

    const result = await provider.streamChat(
      {
        messages: messagesForModel,
        provider: parsedBody.data.provider,
        model: parsedBody.data.model,
        apiKey: parsedBody.data.apiKey,
      },
      {
        prompt: systemPrompt,
        tools: chatTools,
        maxSteps: 5,
      }
    );

    result.consumeStream();

    const stream = createUIMessageStream({
      originalMessages: messagesForModel,
      generateId: () => `${crypto.randomUUID()}`,
      execute: async ({ writer }) => {
        let assistantText = '';

        for await (const chunk of toUIMessageStream({
          stream: result.stream,
          sendFinish: false,
        })) {
          if (chunk.type === 'text-delta') {
            assistantText += chunk.delta;
          }

          writer.write(chunk);
        }

        const suggestions = await generateAiChatSuggestions({
          provider,
          messages: messagesForModel,
          assistantText,
          providerName,
          model: parsedBody.data.model,
          apiKey: parsedBody.data.apiKey,
        });

        writer.write({
          type: 'data-suggestions',
          id: `suggestions-${crypto.randomUUID()}`,
          data: { items: suggestions },
        });
        writer.write({ type: 'finish', finishReason: 'stop' });
      },

      onEnd: async ({ messages }) => {
        await ChatPersistenceService.saveMessages({
          chatId,
          userId,
          guestId,
          messages,
          provider: providerName,
          model: parsedBody.data.model,
        });
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
