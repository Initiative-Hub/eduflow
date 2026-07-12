import type { UIMessage } from 'ai';
import {
  AiChatRole,
  AiChatStatus,
  AiChatType,
  ShareResourceType,
} from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import {
  getStudyInteractiveContentParts,
  type StudyInteractiveContentData,
  studyInteractiveContentSchema,
} from '@/utils/study-interactive-content';
import { z } from 'zod';

import {
  isStudyPracticeQuizData,
  type StudyPracticeQuizData,
} from '@/utils/study-practice-quiz';

const publicStudyChatPartSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('text'),
    text: z.string().min(1),
  }),
  z.object({
    type: z.literal('data-interactive-content'),
    data: studyInteractiveContentSchema,
  }),
  z.object({
    type: z.literal('data-practice-quiz'),
    data: z.custom<StudyPracticeQuizData>(isStudyPracticeQuizData),
  }),
]);

const publicStudyChatMessageSchema = z.object({
  id: z.string().min(1),
  role: z.enum(['user', 'assistant']),
  parts: z.array(publicStudyChatPartSchema),
});

const publicStudyChatSnapshotSchema = z.object({
  version: z.literal(1),
  messages: z.array(publicStudyChatMessageSchema),
});

type PublicStudyChatPart = z.infer<typeof publicStudyChatPartSchema>;
type PublicStudyChatMessage = z.infer<typeof publicStudyChatMessageSchema>;
type PublicStudyChatSnapshot = z.infer<typeof publicStudyChatSnapshotSchema>;

function createPublicStudyChatSnapshot(
  uiMessages: UIMessage[]
): PublicStudyChatSnapshot {
  const messages: PublicStudyChatMessage[] = [];

  for (const message of uiMessages) {
    if (message.role !== 'user' && message.role !== 'assistant') {
      continue;
    }

    const parts: PublicStudyChatPart[] = [];

    for (const part of message.parts) {
      if (part.type === 'text' && part.text.trim()) {
        parts.push({
          type: 'text',
          text: part.text,
        });
        continue;
      }

      if (part.type === 'data-interactive-content') {
        const content = studyInteractiveContentSchema.safeParse(part.data);

        if (content.success) {
          parts.push({
            type: 'data-interactive-content',
            data: content.data,
          });
        }

        continue;
      }

      if (
        part.type === 'data-practice-quiz' &&
        isStudyPracticeQuizData(part.data)
      ) {
        parts.push({
          type: 'data-practice-quiz',
          data: part.data,
        });
      }
    }

    if (parts.length > 0) {
      messages.push({
        id: message.id,
        role: message.role,
        parts,
      });
    }
  }

  return {
    version: 1,
    messages,
  };
}

function createInteractiveContentSharedResource(input: {
  chatId: string;
  content: StudyInteractiveContentData;
  sourceMessageId: string | null;
  userId: string;
}) {
  return prisma.sharedResource.create({
    data: {
      ownerUserId: input.userId,
      resourceType: ShareResourceType.STUDY_INTERACTIVE_CONTENT,
      sourceChatId: input.chatId,
      sourceMessageId: input.sourceMessageId,
      title: input.content.title,
      description: input.content.description,
      payload: input.content,
    },
    select: {
      id: true,
    },
  });
}

export class StudyShareService {
  static async createInteractiveContentShare(input: {
    chatId: string;
    content?: StudyInteractiveContentData;
    userId: string;
    messageId: string;
    contentIndex: number;
  }) {
    const message = await prisma.aiChatMessage.findFirst({
      where: {
        id: input.messageId,
        chatId: input.chatId,
        role: AiChatRole.ASSISTANT,
        chat: {
          userId: input.userId,
          type: AiChatType.STUDY_ASSISTANT,
          status: AiChatStatus.ACTIVE,
          deletedAt: null,
        },
      },
      select: {
        id: true,
        parts: true,
      },
    });

    if (!message) {
      if (!input.content) return null;

      const chat = await prisma.aiChat.findFirst({
        where: {
          id: input.chatId,
          userId: input.userId,
          type: AiChatType.STUDY_ASSISTANT,
          status: AiChatStatus.ACTIVE,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!chat) return null;

      const parsedContent = studyInteractiveContentSchema.safeParse(
        input.content
      );

      if (!parsedContent.success) return null;

      return createInteractiveContentSharedResource({
        chatId: input.chatId,
        content: parsedContent.data,
        sourceMessageId: null,
        userId: input.userId,
      });
    }

    const interactiveContents = getStudyInteractiveContentParts({
      id: message.id,
      role: 'assistant',
      parts: Array.isArray(message.parts) ? message.parts : [],
    } as UIMessage);

    const content = interactiveContents[input.contentIndex];
    const parsedContent = studyInteractiveContentSchema.safeParse(content);

    if (!parsedContent.success) return null;

    return createInteractiveContentSharedResource({
      chatId: input.chatId,
      content: parsedContent.data,
      sourceMessageId: message.id,
      userId: input.userId,
    });
  }
  static async getPublicInteractiveContent(shareId: string) {
    const sharedResource = await prisma.sharedResource.findFirst({
      where: {
        id: shareId,
        resourceType: ShareResourceType.STUDY_INTERACTIVE_CONTENT,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: {
        ownerUserId: true,
        payload: true,
        sourceChatId: true,
      },
    });

    if (!sharedResource) return null;

    const parsedPayload = studyInteractiveContentSchema.safeParse(
      sharedResource.payload
    );

    return parsedPayload.success
      ? {
          content: parsedPayload.data,
          ownerUserId: sharedResource.ownerUserId,
          sourceChatId: sharedResource.sourceChatId,
        }
      : null;
  }
}
