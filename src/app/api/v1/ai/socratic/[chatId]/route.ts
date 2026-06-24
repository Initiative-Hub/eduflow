import { createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { z } from 'zod';
import { AiChatType } from '@/generated/prisma';
import { getChatOwner } from '@/lib/api/guest-session';
import { socraticGuidanceDepthSchema } from '@/lib/validations/socratic.schema';
import { ChatProviderFactory } from '@/services/ai/ChatProviderFactory';
import { CHAT_MODEL_IDS } from '@/services/ai/chat-models';
import { DEFAULT_PROVIDER } from '@/services/ai/chat-provider.constants';
import type { ChatProvider } from '@/services/ai/chat-provider.types';
import { CacheService } from '@/services/CacheService';
import { ChatPersistenceService } from '@/services/ChatPersistenceService';
import type { SocraticUIMessage } from '@/types/socratic-ui-message';
import {
  hasChatFileParts,
  hydrateChatAttachmentDataUrls,
} from '@/utils/chat-attachments';
import {
  generateSocraticSuggestions,
  getSocraticSystemPrompt,
} from './socratic.constants';

const socraticRequestSchema = z.object({
  message: z.custom<SocraticUIMessage>(),
  guidanceDepth: socraticGuidanceDepthSchema.default('balanced'),
  provider: z.custom<ChatProvider>().optional(),
  model: z.enum(CHAT_MODEL_IDS).optional(),
  apiKey: z.string().min(1).optional(),
});

const socraticUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    deleted_at: z.string().datetime().optional(),
  })
  .refine((data) => data.title !== undefined || data.deleted_at !== undefined, {
    message: 'Provide title or deleted_at',
  });

/**
 * @swagger
 * /api/v1/ai/socratic/{chatId}:
 *   get:
 *     tags:
 *       - Socratic
 *     summary: Get Socratic tutor session metadata and messages
 *     responses:
 *       200:
 *         description: Socratic session data
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

    const socraticData = await ChatPersistenceService.getChat({
      chatId,
      userId,
      guestId,
      chatType: AiChatType.SOCRATIC_TUTOR,
    });

    if (!socraticData) {
      return new Response(
        JSON.stringify({ error: 'Session not found or access denied' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify(socraticData), {
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
 * /api/v1/ai/socratic/{chatId}:
 *   patch:
 *     tags:
 *       - Socratic
 *     summary: Update Socratic session title or soft delete a Socratic session
 *     responses:
 *       200:
 *         description: Updated Socratic session metadata
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
    const parsedBody = socraticUpdateSchema.safeParse(body);

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
      chatType: AiChatType.SOCRATIC_TUTOR,
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
 * /api/v1/ai/socratic/{chatId}:
 *   post:
 *     tags:
 *       - Socratic
 *     summary: Send a Socratic tutor prompt and receive a streamed guided response
 *     responses:
 *       200:
 *         description: Streamed Socratic tutor response
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
    const parsedBody = socraticRequestSchema.safeParse(body);

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

    const socraticData = await ChatPersistenceService.getChat({
      chatId,
      userId,
      guestId,
      chatType: AiChatType.SOCRATIC_TUTOR,
    });

    if (!socraticData) {
      return new Response(
        JSON.stringify({ error: 'Session not found or access denied' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const messagesForRequest = [
      ...(socraticData.messages as SocraticUIMessage[]),
      parsedBody.data.message,
    ];
    const hasFileParts = hasChatFileParts(messagesForRequest);
    if (hasFileParts && !userId) {
      return new Response(
        JSON.stringify({ error: 'File attachments require sign-in' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let messagesForModel = messagesForRequest;
    if (hasFileParts && userId) {
      try {
        messagesForModel = (await hydrateChatAttachmentDataUrls({
          messages: messagesForRequest,
          userId,
        })) as SocraticUIMessage[];
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
    const systemPrompt = getSocraticSystemPrompt(parsedBody.data.guidanceDepth);

    const result = await provider.streamChat(
      {
        messages: messagesForModel,
        provider: parsedBody.data.provider,
        model: parsedBody.data.model,
        apiKey: parsedBody.data.apiKey,
      },
      { prompt: systemPrompt }
    );

    const stream = createUIMessageStream<SocraticUIMessage>({
      originalMessages: messagesForModel,
      generateId: () => `${crypto.randomUUID()}`,
      execute: async ({ writer }) => {
        let assistantText = '';

        for await (const chunk of result.toUIMessageStream<SocraticUIMessage>({
          sendFinish: false,
        })) {
          if (chunk.type === 'text-delta') {
            assistantText += chunk.delta;
          }

          writer.write(chunk);
        }

        const suggestions = await generateSocraticSuggestions({
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
      onFinish: async ({ messages }) => {
        await ChatPersistenceService.saveMessages({
          chatId,
          userId,
          guestId,
          messages,
          provider: providerName,
          model: parsedBody.data.model,
          chatType: AiChatType.SOCRATIC_TUTOR,
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
