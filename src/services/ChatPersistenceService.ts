import type { UIMessage } from 'ai';
import { AiChatRole, AiChatStatus, type Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { CacheService } from '@/services/CacheService';
import { getMessagePreview } from '@/utils/chat-message';
import { buildNewChatData, type ChatCacheData } from '@/utils/chat-session';

const CHAT_TTL_SECONDS = 60 * 60 * 24;

export interface ChatListItem {
  id: string;
  title: string;
  messageCount: number;
  updatedAt: string;
}

interface ChatOwner {
  userId?: string;
  guestId?: string;
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

type CachedChat = ChatCacheData & {
  updatedAt?: string;
};

const getGuestChatIndexKey = (guestId: string) => `guest_chats:${guestId}`;

const normalizeSearch = (search?: string) => search?.trim().toLowerCase() ?? '';

const getTitle = (firstMessage: string) =>
  getMessagePreview(firstMessage) || 'New Chat';

const toStoredRole = (role: UIMessage['role']) =>
  AiChatRole[role.toUpperCase() as keyof typeof AiChatRole];

const toUiRole = (role: string): UIMessage['role'] =>
  role.toLowerCase() as UIMessage['role'];

async function updateGuestChatIndex(guestId: string, item: ChatListItem) {
  const key = getGuestChatIndexKey(guestId);
  const existing = (await CacheService.getCache<ChatListItem[]>(key)) ?? [];
  const nextItems = [
    item,
    ...existing.filter((chat) => chat.id !== item.id),
  ].toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  await CacheService.setCache(key, nextItems, { ttlSeconds: CHAT_TTL_SECONDS });
}

export class ChatPersistenceService {
  static async createChat({
    firstMessage,
    userId,
    guestId,
  }: ChatOwner & {
    firstMessage: string;
  }) {
    const title = getTitle(firstMessage);

    if (userId) {
      const chat = await prisma.aiChat.create({
        data: {
          userId,
          title,
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
      updatedAt,
    };

    await CacheService.setCache(chatId, chatData, {
      ttlSeconds: CHAT_TTL_SECONDS,
    });
    await updateGuestChatIndex(guestId, {
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
  }: ChatOwner & { chatId: string }) {
    if (userId) {
      const chat = await prisma.aiChat.findFirst({
        where: {
          id: chatId,
          userId,
          status: AiChatStatus.ACTIVE,
          deletedAt: null,
        },
        select: {
          id: true,
          title: true,
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
        messageCount: messages.length,
        messages,
        updatedAt: chat.updatedAt.toISOString(),
      };
    }

    if (!guestId) return null;

    const chatData = await CacheService.getCache<CachedChat>(chatId);
    if (!chatData || chatData.guestId !== guestId) return null;

    return {
      guestId: chatData.guestId,
      title: chatData.title,
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
  }: SaveMessagesInput) {
    const updatedAt = new Date();

    if (userId) {
      const chat = await prisma.aiChat.findFirst({
        where: {
          id: chatId,
          userId,
          status: AiChatStatus.ACTIVE,
          deletedAt: null,
        },
        select: { id: true, userId: true, title: true },
      });

      if (!chat) return null;

      await prisma.$transaction(async (tx) => {
        await tx.aiChatMessage.deleteMany({ where: { chatId } });
        await tx.aiChatMessage.createMany({
          data: messages.map((message, index) => ({
            chatId,
            userId,
            role: toStoredRole(message.role),
            parts: message.parts as unknown as Prisma.InputJsonValue,
            provider,
            model,
            createdAt: new Date(updatedAt.getTime() + index),
          })),
        });
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
    if (!chatData || chatData.guestId !== guestId) return null;

    const nextData: CachedChat = {
      ...chatData,
      messages,
      messageCount: messages.length,
      updatedAt: updatedAt.toISOString(),
    };

    await CacheService.setCache(chatId, nextData, {
      ttlSeconds: CHAT_TTL_SECONDS,
    });
    await updateGuestChatIndex(guestId, {
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
  }: ListChatsInput) {
    const query = normalizeSearch(search);

    if (userId) {
      const where: Prisma.AiChatWhereInput = {
        userId,
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
        getGuestChatIndexKey(guestId)
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
}
