import { tavilySearch } from '@tavily/ai-sdk';
import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from 'ai';
import { z } from 'zod';
import { AiChatType } from '@/generated/prisma';
import { getChatOwner } from '@/lib/api/guest-session';
import { studyModeSchema } from '@/lib/validations/study.schema';
import { ChatProviderFactory } from '@/services/ai/ChatProviderFactory';
import { DEFAULT_PROVIDER } from '@/services/ai/chat-provider.constants';
import type {
  ChatProvider,
  StreamChatInput,
} from '@/services/ai/chat-provider.types';
import { CacheService } from '@/services/CacheService';
import { ChatPersistenceService } from '@/services/ChatPersistenceService';
import {
  hasChatFileParts,
  hydrateChatAttachmentDataUrls,
} from '@/utils/chat-attachments';
import {
  generateStudySuggestions,
  getStudySystemPrompt,
} from './study.constant';
export const maxDuration = 30;

const studyRequestSchema = z.object({
  messages: z.array(z.custom<UIMessage>()).min(1),
  mode: studyModeSchema.default('review'),
  provider: z.custom<ChatProvider>().optional(),
  model: z.string().min(1).optional(),
  apiKey: z.string().min(1).optional(),
  providerOptions: z.custom<StreamChatInput['providerOptions']>().optional(),
});

const studyUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    deleted_at: z.coerce.date().optional(),
  })
  .refine((data) => data.title !== undefined || data.deleted_at !== undefined, {
    message: 'Provide title or deleted_at',
  });

/**
 * @swagger
 * /api/v1/ai/study/{chatId}:
 *   get:
 *     tags:
 *       - Study
 *     summary: Get Study Assistant session metadata and messages
 *     responses:
 *       200:
 *         description: Study session data
 *       404:
 *         description: Session not found
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await params;
    const { userId, guestId } = await getChatOwner();

    if (!userId && !guestId) {
      return new Response(JSON.stringify({ error: 'Missing guest session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const studyData = await ChatPersistenceService.getChat({
      chatId,
      userId,
      guestId,
      chatType: AiChatType.STUDY_ASSISTANT,
    });

    if (!studyData) {
      return new Response(
        JSON.stringify({
          error: 'Session not found or access denied',
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify(studyData), {
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
 * /api/v1/ai/study/{chatId}:
 *   patch:
 *     tags:
 *       - Study
 *     summary: Update Study session title or soft delete
 *     responses:
 *       200:
 *         description: Updated study session metadata
 *       400:
 *         description: Invalid request payload
 *       404:
 *         description: Session not found
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const [{ chatId }, body] = await Promise.all([params, req.json()]);
    const parsedBody = studyUpdateSchema.safeParse(body);

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
      chatType: AiChatType.STUDY_ASSISTANT,
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
 * /api/v1/ai/study/{chatId}:
 *   post:
 *     tags:
 *       - Study
 *     summary: Send a study prompt and receive a streamed response
 *     responses:
 *       200:
 *         description: Streamed study response
 *       400:
 *         description: Invalid request payload
 *       429:
 *         description: Guest limit reached
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const [{ chatId }, body] = await Promise.all([params, req.json()]);
    const parsedBody = studyRequestSchema.safeParse(body);

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

    const studyData = await ChatPersistenceService.getChat({
      chatId,
      userId,
      guestId,
      chatType: AiChatType.STUDY_ASSISTANT,
    });

    if (!studyData) {
      return new Response(
        JSON.stringify({ error: 'Session not found or access denied' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const hasFileParts = hasChatFileParts(parsedBody.data.messages);
    if (hasFileParts && !userId) {
      return new Response(
        JSON.stringify({ error: 'File attachments require sign-in' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let messagesForModel = parsedBody.data.messages;
    if (hasFileParts && userId) {
      try {
        messagesForModel = await hydrateChatAttachmentDataUrls({
          messages: parsedBody.data.messages,
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

    const providerName = parsedBody.data.provider ?? DEFAULT_PROVIDER;
    const provider = ChatProviderFactory.create(providerName);
    const systemPrompt = getStudySystemPrompt(parsedBody.data.mode);

    const tools =
      parsedBody.data.mode === 'research'
        ? { webSearch: tavilySearch({ maxResults: 5 }) }
        : undefined;

    const maxSteps = parsedBody.data.mode === 'research' ? 5 : undefined;

    const result = await provider.streamChat(
      {
        messages: messagesForModel,
        provider: parsedBody.data.provider,
        model: parsedBody.data.model,
        apiKey: parsedBody.data.apiKey,
        providerOptions: parsedBody.data.providerOptions,
      },
      { prompt: systemPrompt, tools, maxSteps }
    );

    const stream = createUIMessageStream<UIMessage>({
      originalMessages: messagesForModel,
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

        const suggestions = await generateStudySuggestions({
          provider,
          messages: messagesForModel,
          assistantText,
          providerName,
          model: parsedBody.data.model,
          apiKey: parsedBody.data.apiKey,
          providerOptions: parsedBody.data.providerOptions,
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
          chatType: AiChatType.STUDY_ASSISTANT,
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
