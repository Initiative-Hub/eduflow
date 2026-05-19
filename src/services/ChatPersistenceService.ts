import type { UIMessage } from 'ai';
import {
  AiChatRole,
  AiChatStatus,
  AiChatType,
  type Prisma,
} from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { CacheService } from '@/services/CacheService';
import { getMessagePreview } from '@/utils/chat-message';
import { buildNewChatData, type ChatCacheData } from '@/utils/chat-session';

const CHAT_TTL_SECONDS = 60 * 60 * 24;
const DEFAULT_CHAT_TYPE = AiChatType.CHAT_ASSISTANT;

export interface ChatListItem {
  id: string;
  title: string;
  messageCount: number;
  updatedAt: string;
}

export type ChatMetadata = Prisma.JsonValue;

interface ChatOwner {
  userId?: string;
  guestId?: string;
  chatType?: AiChatType;
}

interface ListChatsInput extends ChatOwner {
  search?: string;
  limit: number;
  offset: number;
}

interface SaveMessagesInput extends ChatOwner {
  chatId: string;
  messages: UIMessage[];
  provider?: string;
  model?: string;
}

interface UpdateChatInput extends ChatOwner {
  chatId: string;
  title?: string;
  deletedAt?: Date;
}

type CachedChat = ChatCacheData & {
  type?: AiChatType;
  metadata?: Prisma.JsonValue;
  updatedAt?: string;
  deletedAt?: string | null;
};

const getGuestChatIndexKey = (guestId: string, chatType: AiChatType) =>
  `guest_chats:${guestId}:${chatType}`;

const normalizeSearch = (search?: string) => search?.trim().toLowerCase() ?? '';

const getTitle = (firstMessage: string) =>
  getMessagePreview(firstMessage) || 'New Chat';

const toStoredRole = (role: UIMessage['role']) =>
  AiChatRole[role.toUpperCase() as keyof typeof AiChatRole];

const toUiRole = (role: string): UIMessage['role'] =>
  role.toLowerCase() as UIMessage['role'];

async function updateGuestChatIndex(
  guestId: string,
  chatType: AiChatType,
  item: ChatListItem
) {
  const key = getGuestChatIndexKey(guestId, chatType);
  const existing = (await CacheService.getCache<ChatListItem[]>(key)) ?? [];
  const nextItems = [
    item,
    ...existing.filter((chat) => chat.id !== item.id),
  ].toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  await CacheService.setCache(key, nextItems, { ttlSeconds: CHAT_TTL_SECONDS });
}

async function removeGuestChatFromIndex(
  guestId: string,
  chatType: AiChatType,
  chatId: string
) {
  const key = getGuestChatIndexKey(guestId, chatType);
  const existing = (await CacheService.getCache<ChatListItem[]>(key)) ?? [];
  const nextItems = existing.filter((chat) => chat.id !== chatId);

  await CacheService.setCache(key, nextItems, { ttlSeconds: CHAT_TTL_SECONDS });
}

export class ChatPersistenceService {
  static async createChat({
    firstMessage,
    userId,
    guestId,
    chatType = DEFAULT_CHAT_TYPE,
    metadata,
  }: ChatOwner & {
    firstMessage: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    const title = getTitle(firstMessage);

    if (userId) {
      const chat = await prisma.aiChat.create({
        data: {
          userId,
          title,
          type: chatType,
          ...(metadata !== undefined ? { metadata } : {}),
        },
        select: { id: true },
      });

      return { chatId: chat.id };
    }

    if (!guestId) {
      throw new Error('Missing chat owner');
    }

    const chatId = `chat_${crypto.randomUUID()}`;
    const updatedAt = new Date().toISOString();
    const chatData: CachedChat = {
      ...buildNewChatData({ guestId, firstMessage }),
      type: chatType,
      ...(metadata !== undefined
        ? { metadata: metadata as Prisma.JsonValue }
        : {}),
      updatedAt,
    };

    await CacheService.setCache(chatId, chatData, {
      ttlSeconds: CHAT_TTL_SECONDS,
    });
    await updateGuestChatIndex(guestId, chatType, {
      id: chatId,
      title,
      messageCount: 0,
      updatedAt,
    });

    return { chatId };
  }

  static async getChat({
    chatId,
    userId,
    guestId,
    chatType = DEFAULT_CHAT_TYPE,
  }: ChatOwner & { chatId: string }) {
    if (userId) {
      const chat = await prisma.aiChat.findFirst({
        where: {
          id: chatId,
          userId,
          type: chatType,
          status: AiChatStatus.ACTIVE,
          deletedAt: null,
        },
        select: {
          id: true,
          title: true,
          metadata: true,
          updatedAt: true,
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

      const messages = chat.messages.map((message) => ({
        id: message.id,
        role: toUiRole(message.role),
        parts: Array.isArray(message.parts) ? message.parts : [],
      })) as UIMessage[];

      return {
        title: chat.title,
        metadata: chat.metadata,
        messageCount: messages.length,
        messages,
        updatedAt: chat.updatedAt.toISOString(),
      };
    }

    if (!guestId) return null;

    const chatData = await CacheService.getCache<CachedChat>(chatId);
    if (
      !chatData ||
      chatData.guestId !== guestId ||
      chatData.deletedAt ||
      (chatData.type ?? DEFAULT_CHAT_TYPE) !== chatType
    ) {
      return null;
    }

    return {
      guestId: chatData.guestId,
      title: chatData.title,
      metadata: chatData.metadata,
      messageCount: chatData.messageCount ?? 0,
      messages: chatData.messages ?? [],
      updatedAt: chatData.updatedAt,
    };
  }

  static async saveMessages({
    chatId,
    userId,
    guestId,
    messages,
    provider,
    model,
    chatType = DEFAULT_CHAT_TYPE,
  }: SaveMessagesInput) {
    const updatedAt = new Date();

    if (userId) {
      const chat = await prisma.aiChat.findFirst({
        where: {
          id: chatId,
          userId,
          type: chatType,
          status: AiChatStatus.ACTIVE,
          deletedAt: null,
        },
        select: { id: true, userId: true, title: true },
      });

      if (!chat) return null;

      await prisma.$transaction(async (tx) => {
        const messageIds = messages.map((message) => message.id);
        const existingMessages =
          messageIds.length > 0
            ? await tx.aiChatMessage.findMany({
                where: {
                  chatId,
                  chat: { type: chatType },
                  id: { in: messageIds },
                },
                select: { id: true },
              })
            : [];
        const existingMessageIds = new Set(
          existingMessages.map((message) => message.id)
        );
        const newMessages = messages.filter(
          (message) => !existingMessageIds.has(message.id)
        );

        if (newMessages.length > 0) {
          await tx.aiChatMessage.createMany({
            data: newMessages.map((message, index) => ({
              id: message.id,
              chatId,
              userId,
              role: toStoredRole(message.role),
              parts: message.parts as unknown as Prisma.InputJsonValue,
              provider,
              model,
              createdAt: new Date(updatedAt.getTime() + index),
            })),
          });
        }

        await tx.aiChat.update({
          where: { id: chatId },
          data: {
            provider,
            model,
            updatedAt,
          },
        });
      });

      return { ok: true };
    }

    if (!guestId) return null;

    const chatData = await CacheService.getCache<CachedChat>(chatId);
    if (
      !chatData ||
      chatData.guestId !== guestId ||
      chatData.deletedAt ||
      (chatData.type ?? DEFAULT_CHAT_TYPE) !== chatType
    ) {
      return null;
    }

    const nextData: CachedChat = {
      ...chatData,
      messages,
      messageCount: messages.length,
      updatedAt: updatedAt.toISOString(),
    };

    await CacheService.setCache(chatId, nextData, {
      ttlSeconds: CHAT_TTL_SECONDS,
    });
    await updateGuestChatIndex(guestId, chatType, {
      id: chatId,
      title: chatData.title,
      messageCount: messages.length,
      updatedAt: updatedAt.toISOString(),
    });

    return { ok: true };
  }

  static async listChats({
    userId,
    guestId,
    search,
    limit,
    offset,
    chatType = DEFAULT_CHAT_TYPE,
  }: ListChatsInput) {
    const query = normalizeSearch(search);

    if (userId) {
      const where: Prisma.AiChatWhereInput = {
        userId,
        type: chatType,
        status: AiChatStatus.ACTIVE,
        deletedAt: null,
        ...(query
          ? { title: { contains: query, mode: 'insensitive' as const } }
          : {}),
      };

      const [total, chats] = await Promise.all([
        prisma.aiChat.count({ where }),
        prisma.aiChat.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          skip: offset,
          take: limit,
          select: {
            id: true,
            title: true,
            updatedAt: true,
            _count: { select: { messages: true } },
          },
        }),
      ] as const);
      const chatItems = chats as Array<{
        id: string;
        title: string;
        updatedAt: Date;
        _count: { messages: number };
      }>;

      return {
        data: chatItems.map((chat) => ({
          id: chat.id,
          title: chat.title,
          messageCount: chat._count?.messages ?? 0,
          updatedAt: chat.updatedAt.toISOString(),
        })),
        pagination: { total, limit, offset },
      };
    }

    if (!guestId) {
      return { data: [], pagination: { total: 0, limit, offset } };
    }

    const chats =
      (await CacheService.getCache<ChatListItem[]>(
        getGuestChatIndexKey(guestId, chatType)
      )) ?? [];
    const filtered = query
      ? chats.filter((chat) => chat.title.toLowerCase().includes(query))
      : chats;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      data: paginated,
      pagination: { total: filtered.length, limit, offset },
    };
  }

  static async updateChat({
    chatId,
    userId,
    guestId,
    title,
    deletedAt,
    chatType = DEFAULT_CHAT_TYPE,
  }: UpdateChatInput) {
    if (userId) {
      const chat = await prisma.aiChat.findFirst({
        where: {
          id: chatId,
          userId,
          type: chatType,
          status: AiChatStatus.ACTIVE,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!chat) return null;

      const updatedChat = await prisma.aiChat.update({
        where: { id: chatId },
        data: {
          ...(title !== undefined ? { title } : {}),
          ...(deletedAt !== undefined ? { deletedAt } : {}),
        },
        select: {
          id: true,
          title: true,
          updatedAt: true,
          deletedAt: true,
        },
      });

      return {
        id: updatedChat.id,
        title: updatedChat.title,
        updatedAt: updatedChat.updatedAt.toISOString(),
        deletedAt: updatedChat.deletedAt?.toISOString() ?? null,
      };
    }

    if (!guestId) return null;

    const chatData = await CacheService.getCache<CachedChat>(chatId);
    if (
      !chatData ||
      chatData.guestId !== guestId ||
      chatData.deletedAt ||
      (chatData.type ?? DEFAULT_CHAT_TYPE) !== chatType
    ) {
      return null;
    }

    const updatedAt = new Date().toISOString();
    const nextData: CachedChat = {
      ...chatData,
      ...(title !== undefined ? { title } : {}),
      ...(deletedAt !== undefined
        ? { deletedAt: deletedAt.toISOString() }
        : {}),
      updatedAt,
    };

    await CacheService.setCache(chatId, nextData, {
      ttlSeconds: CHAT_TTL_SECONDS,
    });

    if (deletedAt) {
      await removeGuestChatFromIndex(guestId, chatType, chatId);
    } else {
      await updateGuestChatIndex(guestId, chatType, {
        id: chatId,
        title: nextData.title,
        messageCount: nextData.messageCount ?? 0,
        updatedAt,
      });
    }

    return {
      id: chatId,
      title: nextData.title,
      updatedAt,
      deletedAt: nextData.deletedAt ?? null,
    };
  }
}
