import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from 'ai';
import { z } from 'zod';
import { AiChatType } from '@/generated/prisma';
import { getChatOwner } from '@/lib/api/guest-session';
import { writingToolSchema } from '@/lib/validations/writing.schema';
import { ChatProviderFactory } from '@/services/ai/ChatProviderFactory';
import { DEFAULT_PROVIDER } from '@/services/ai/chat-provider.constants';
import type { ChatProvider } from '@/services/ai/chat-provider.types';
import { CacheService } from '@/services/CacheService';
import { ChatPersistenceService } from '@/services/ChatPersistenceService';
import {
  generateWritingSuggestions,
  getWritingSystemPrompt,
} from './writing.constants';

const writingRequestSchema = z.object({
  message: z.custom<UIMessage>(),
  tool: writingToolSchema,
  provider: z.custom<ChatProvider>().optional(),
  model: z.string().min(1).optional(),
  apiKey: z.string().min(1).optional(),
});

const writingUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    deleted_at: z.string().datetime().optional(),
  })
  .refine((data) => data.title !== undefined || data.deleted_at !== undefined, {
    message: 'Provide title or deleted_at',
  });

/**
 * @swagger
 * /api/v1/ai/writing/{chatId}:
 *   patch:
 *     tags:
 *       - Writing
 *     summary: Update writing session title or soft delete a writing session
 *     responses:
 *       200:
 *         description: Updated writing session metadata
 *       400:
 *         description: Invalid request payload
 *       401:
 *         description: Missing guest session
 *       404:
 *         description: Session not found
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const [{ chatId }, body] = await Promise.all([params, req.json()]);

    const parsedBody = writingUpdateSchema.safeParse(body);
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
      chatType: AiChatType.WRITING_ASSISTANT,
    });

    if (!updatedChat) {
      return new Response(
        JSON.stringify({ error: 'Session not found or access denied' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
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

    const { userId, guestId } = await getChatOwner();

    if (!userId && !guestId) {
      return new Response(JSON.stringify({ error: 'Missing guest session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const limitStatus = userId
      ? { allowed: true, remaining: Number.POSITIVE_INFINITY }
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

    const writingData = await ChatPersistenceService.getChat({
      chatId,
      userId,
      guestId,
      chatType: AiChatType.WRITING_ASSISTANT,
    });

    if (!writingData) {
      return new Response(
        JSON.stringify({ error: 'Session not found or access denied' }),
        {
          status: 404,
        }
      );
    }

    const messagesForRequest = [
      ...writingData.messages,
      parsedBody.data.message,
    ];

    const providerName = parsedBody.data.provider ?? DEFAULT_PROVIDER;
    const provider = ChatProviderFactory.create(providerName);
    const writingTool = parsedBody.data.tool;
    const systemPrompt = getWritingSystemPrompt(writingTool);

    const result = await provider.streamChat(
      {
        messages: messagesForRequest,
        provider: parsedBody.data.provider,
        model: parsedBody.data.model,
        apiKey: parsedBody.data.apiKey,
      },
      { prompt: systemPrompt }
    );

    result.consumeStream();

    const stream = createUIMessageStream<UIMessage>({
      originalMessages: messagesForRequest,
      generateId: () => `${crypto.randomUUID()}`,
      execute: async ({ writer }) => {
        let assistantText = '';

        for await (const chunk of result.toUIMessageStream<UIMessage>({
          sendFinish: false,
        })) {
          if (chunk.type === 'text-delta') {
            assistantText += chunk.delta;
          }

          writer.write(chunk);
        }

        const suggestions = await generateWritingSuggestions({
          provider,
          messages: messagesForRequest,
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
      onFinish: async ({ messages }) => {
        await ChatPersistenceService.saveMessages({
          chatId,
          userId,
          guestId,
          messages,
          provider: providerName,
          model: parsedBody.data.model,
          chatType: AiChatType.WRITING_ASSISTANT,
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
