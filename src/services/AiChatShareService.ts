import type { UIMessage } from 'ai';
import { z } from 'zod';
import {
  AiChatStatus,
  type AiChatType,
  type Prisma,
  ShareResourceType,
} from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import type { ShareableAiChatType } from '@/lib/validations/ai-chat-share.schema';
import { studyInteractiveContentSchema } from '@/utils/study-interactive-content';
import {
  isStudyPracticeQuizData,
  type StudyPracticeQuizData,
} from '@/utils/study-practice-quiz';

const publicChatPartSchema = z.discriminatedUnion('type', [
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

const publicChatMessageSchema = z.object({
  id: z.string().min(1),
  role: z.enum(['user', 'assistant']),
  parts: z.array(publicChatPartSchema),
});

const publicChatSnapshotSchema = z.object({
  version: z.literal(1),
  chatType: z.enum([
    'CHAT_ASSISTANT',
    'SOCRATIC_TUTOR',
    'WRITING_ASSISTANT',
    'STUDY_ASSISTANT',
  ]),
  messages: z.array(publicChatMessageSchema),
});

type PublicChatPart = z.infer<typeof publicChatPartSchema>;
type PublicChatMessage = z.infer<typeof publicChatMessageSchema>;
type PublicChatSnapshot = z.infer<typeof publicChatSnapshotSchema>;

function createPublicChatSnapshot(input: {
  chatType: ShareableAiChatType;
  messages: Array<{
    id: string;
    role: string;
    parts: unknown;
  }>;
}): PublicChatSnapshot {
  const messages: PublicChatMessage[] = [];

  for (const message of input.messages) {
    const role = message.role.toLowerCase();

    if (role !== 'user' && role !== 'assistant') {
      continue;
    }

    const parts: PublicChatPart[] = [];

    for (const rawPart of Array.isArray(message.parts) ? message.parts : []) {
      const parsedPart = publicChatPartSchema.safeParse(rawPart);

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
    chatType: input.chatType,
    messages,
  };
}

export class AiChatShareService {
  static async createShare(input: {
    chatId: string;
    chatType: ShareableAiChatType;
    userId: string;
  }) {
    const chat = await prisma.aiChat.findFirst({
      where: {
        id: input.chatId,
        userId: input.userId,
        type: input.chatType as AiChatType,
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

    const payload = createPublicChatSnapshot({
      chatType: input.chatType,
      messages: chat.messages,
    });

    return prisma.sharedResource.create({
      data: {
        ownerUserId: input.userId,
        resourceType: ShareResourceType.AI_CHAT,
        sourceChatId: chat.id,
        title: chat.title || 'Shared AI chat',
        payload: payload as Prisma.InputJsonValue,
      },
      select: {
        id: true,
      },
    });
  }

  static async getPublicShare(shareId: string) {
    const sharedResource = await prisma.sharedResource.findFirst({
      where: {
        id: shareId,
        resourceType: ShareResourceType.AI_CHAT,
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

    const payload = publicChatSnapshotSchema.safeParse(sharedResource.payload);

    if (!payload.success) return null;

    return {
      chatType: payload.data.chatType,
      messages: payload.data.messages as unknown as UIMessage[],
      ownerUserId: sharedResource.ownerUserId,
      sourceChatId: sharedResource.sourceChatId,
      title: sharedResource.title,
    };
  }

  static async listShares(input: {
    page: number;
    pageSize: number;
    userId: string;
  }) {
    const where = {
      ownerUserId: input.userId,
      resourceType: {
        in: [
          ShareResourceType.AI_CHAT,
          ShareResourceType.STUDY_INTERACTIVE_CONTENT,
        ],
      },
      revokedAt: null,
    };

    const [total, data] = await Promise.all([
      prisma.sharedResource.count({ where }),
      prisma.sharedResource.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        select: {
          id: true,
          title: true,
          createdAt: true,
          resourceType: true,
        },
      }),
    ]);

    return {
      data,
      pagination: {
        page: input.page,
        pageSize: input.pageSize,
        total,
        totalPages: Math.ceil(total / input.pageSize),
      },
    };
  }

  static async revokeShare(input: { shareId: string; userId: string }) {
    const result = await prisma.sharedResource.updateMany({
      where: {
        id: input.shareId,
        ownerUserId: input.userId,
        resourceType: {
          in: [
            ShareResourceType.AI_CHAT,
            ShareResourceType.STUDY_INTERACTIVE_CONTENT,
          ],
        },
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return result.count === 1;
  }
}
