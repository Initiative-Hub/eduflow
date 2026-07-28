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
  static async getOwnedInteractiveContent(input: {
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

      if (!chat || !input.content) return null;

      const parsedContent = studyInteractiveContentSchema.safeParse(
        input.content
      );

      return parsedContent.success ? { content: parsedContent.data } : null;
    }

    const interactiveContents = getStudyInteractiveContentParts({
      id: message.id,
      role: 'assistant',
      parts: Array.isArray(message.parts) ? message.parts : [],
    } as UIMessage);

    const content = interactiveContents[input.contentIndex];
    const parsedContent = studyInteractiveContentSchema.safeParse(content);

    return parsedContent.success ? { content: parsedContent.data } : null;
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
