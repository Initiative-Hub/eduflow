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
  studyInteractiveContentSchema,
} from '@/utils/study-interactive-content';

export class StudyShareService {
  static async createInteractiveContentShare(input: {
    chatId: string;
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

    if (!message) return null;

    const interactiveContents = getStudyInteractiveContentParts({
      id: message.id,
      role: 'assistant',
      parts: Array.isArray(message.parts) ? message.parts : [],
    } as UIMessage);

    const content = interactiveContents[input.contentIndex];
    const parsedContent = studyInteractiveContentSchema.safeParse(content);

    if (!parsedContent.success) return null;

    return prisma.sharedResource.create({
      data: {
        ownerUserId: input.userId,
        resourceType: ShareResourceType.STUDY_INTERACTIVE_CONTENT,
        sourceChatId: input.chatId,
        sourceMessageId: message.id,
        title: parsedContent.data.title,
        description: parsedContent.data.description,
        payload: parsedContent.data,
      },
      select: {
        id: true,
      },
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
