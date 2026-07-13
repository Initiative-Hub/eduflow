import type { UIMessage } from 'ai';
import { z } from 'zod';
import {
  AiChatRole,
  AiChatStatus,
  AiChatType,
  type Prisma,
  ShareResourceType,
} from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import {
  getStudyInteractiveContentParts,
  type StudyInteractiveContentData,
  studyInteractiveContentSchema,
} from '@/utils/study-interactive-content';

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
  uiMessages: Array<{
    id: string;
    role: string;
    parts: unknown;
  }>
): PublicStudyChatSnapshot {
  const messages: PublicStudyChatMessage[] = [];

  for (const message of uiMessages) {
    const role = message.role.toLowerCase();

    if (role !== 'user' && role !== 'assistant') {
      continue;
    }

    const parts: PublicStudyChatPart[] = [];

    for (const rawPart of Array.isArray(message.parts) ? message.parts : []) {
      const parsedPart = publicStudyChatPartSchema.safeParse(rawPart);

      if (parsedPart.success) {
        parts.push(parsedPart.data);
      }
    }

    if (parts.length > 0) {
      messages.push({
        id: message.id,
        role,
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
  static async createStudyChatShare(input: { chatId: string; userId: string }) {
    const chat = await prisma.aiChat.findFirst({
      where: {
        id: input.chatId,
        userId: input.userId,
        type: AiChatType.STUDY_ASSISTANT,
        status: AiChatStatus.ACTIVE,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            role: true,
            parts: true,
          },
        },
      },
    });

    if (!chat) return null;

    const snapshot = createPublicStudyChatSnapshot(chat.messages);

    return prisma.sharedResource.create({
      data: {
        ownerUserId: input.userId,
        resourceType: ShareResourceType.STUDY_CHAT,
        sourceChatId: chat.id,
        title: chat.title || 'Shared study chat',
        payload: snapshot as Prisma.InputJsonValue,
      },
      select: {
        id: true,
      },
    });
  }

  static async getPublicStudyChat(shareId: string) {
    const sharedResource = await prisma.sharedResource.findFirst({
      where: {
        id: shareId,
        resourceType: ShareResourceType.STUDY_CHAT,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },

      select: {
        ownerUserId: true,
        payload: true,
        sourceChatId: true,
        title: true,
      },
    });

    if (!sharedResource) return null;

    const snapshot = publicStudyChatSnapshotSchema.safeParse(
      sharedResource.payload
    );

    if (!snapshot.success) return null;

    return {
      messages: snapshot.data.messages as unknown as UIMessage[],
      ownerUserId: sharedResource.ownerUserId,
      sourceChatId: sharedResource.sourceChatId,
      title: sharedResource.title,
    };
  }

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
