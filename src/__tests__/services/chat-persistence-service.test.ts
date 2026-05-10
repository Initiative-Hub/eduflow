import type { UIMessage } from 'ai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { CacheService } from '@/services/CacheService';
import { ChatPersistenceService } from '@/services/ChatPersistenceService';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    aiChat: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    aiChatMessage: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn(async (callback) => callback(prisma)),
  },
}));

vi.mock('@/services/CacheService', () => ({
  CacheService: {
    getCache: vi.fn(),
    setCache: vi.fn(),
  },
}));

const prismaMock = prisma as unknown as {
  aiChat: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  aiChatMessage: {
    deleteMany: ReturnType<typeof vi.fn>;
    createMany: ReturnType<typeof vi.fn>;
  };
};

const cacheMock = CacheService as unknown as {
  getCache: ReturnType<typeof vi.fn>;
  setCache: ReturnType<typeof vi.fn>;
};

const userMessage: UIMessage = {
  id: 'msg-1',
  role: 'user',
  parts: [{ type: 'text', text: 'Explain gravity' }],
};

const assistantMessage: UIMessage = {
  id: 'msg-2',
  role: 'assistant',
  parts: [{ type: 'text', text: 'Gravity attracts mass.' }],
};

describe('ChatPersistenceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates logged-in chats in the database', async () => {
    prismaMock.aiChat.create.mockResolvedValueOnce({ id: 'chat-db-1' });

    const result = await ChatPersistenceService.createChat({
      firstMessage: 'Explain gravity',
      userId: 'user-1',
    });

    expect(result.chatId).toBe('chat-db-1');
    expect(prismaMock.aiChat.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        title: 'Explain gravity',
      },
      select: { id: true },
    });
    expect(cacheMock.setCache).not.toHaveBeenCalled();
  });

  it('creates guest chats in Redis and updates the guest chat index', async () => {
    cacheMock.getCache.mockResolvedValueOnce([]);

    const result = await ChatPersistenceService.createChat({
      firstMessage: 'Explain gravity',
      guestId: 'guest-1',
    });

    expect(result.chatId).toMatch(/^chat_/);
    expect(cacheMock.setCache).toHaveBeenCalledWith(
      result.chatId,
      expect.objectContaining({
        guestId: 'guest-1',
        title: 'Explain gravity',
        messageCount: 0,
        messages: [],
      }),
      { ttlSeconds: 86400 }
    );
    expect(cacheMock.setCache).toHaveBeenCalledWith(
      'guest_chats:guest-1',
      [
        expect.objectContaining({
          id: result.chatId,
          title: 'Explain gravity',
        }),
      ],
      { ttlSeconds: 86400 }
    );
    expect(prismaMock.aiChat.create).not.toHaveBeenCalled();
  });

  it('persists logged-in messages to the database without checking guest rate limits', async () => {
    prismaMock.aiChat.findFirst.mockResolvedValueOnce({
      id: 'chat-db-1',
      userId: 'user-1',
      title: 'Explain gravity',
    });

    await ChatPersistenceService.saveMessages({
      chatId: 'chat-db-1',
      userId: 'user-1',
      messages: [userMessage, assistantMessage],
      provider: 'openrouter',
      model: 'gemini-2.5-pro',
    });

    expect(prismaMock.aiChatMessage.deleteMany).toHaveBeenCalledWith({
      where: { chatId: 'chat-db-1' },
    });
    expect(prismaMock.aiChatMessage.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          chatId: 'chat-db-1',
          userId: 'user-1',
          role: 'USER',
          parts: userMessage.parts,
          provider: 'openrouter',
          model: 'gemini-2.5-pro',
        }),
        expect.objectContaining({
          chatId: 'chat-db-1',
          userId: 'user-1',
          role: 'ASSISTANT',
          parts: assistantMessage.parts,
          provider: 'openrouter',
          model: 'gemini-2.5-pro',
        }),
      ],
    });
    expect(cacheMock.setCache).not.toHaveBeenCalled();
  });

  it('lists logged-in chats from the database with search and pagination', async () => {
    const updatedAt = new Date('2026-01-01T00:00:00.000Z');
    prismaMock.aiChat.count.mockResolvedValueOnce(1);
    prismaMock.aiChat.findMany.mockResolvedValueOnce([
      {
        id: 'chat-db-1',
        title: 'Explain gravity',
        _count: { messages: 2 },
        updatedAt,
      },
    ]);

    const result = await ChatPersistenceService.listChats({
      userId: 'user-1',
      search: 'gravity',
      limit: 20,
      offset: 0,
    });

    expect(prismaMock.aiChat.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        status: 'ACTIVE',
        deletedAt: null,
        title: { contains: 'gravity', mode: 'insensitive' },
      },
      orderBy: { updatedAt: 'desc' },
      skip: 0,
      take: 20,
      select: {
        id: true,
        title: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    });
    expect(result).toEqual({
      data: [
        {
          id: 'chat-db-1',
          title: 'Explain gravity',
          messageCount: 2,
          updatedAt: updatedAt.toISOString(),
        },
      ],
      pagination: { total: 1, limit: 20, offset: 0 },
    });
  });

  it('lists guest chats from the Redis index with search and pagination', async () => {
    cacheMock.getCache.mockResolvedValueOnce([
      {
        id: 'chat-1',
        title: 'Explain gravity',
        messageCount: 2,
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
      {
        id: 'chat-2',
        title: 'French revolution',
        messageCount: 4,
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);

    const result = await ChatPersistenceService.listChats({
      guestId: 'guest-1',
      search: 'gravity',
      limit: 10,
      offset: 0,
    });

    expect(cacheMock.getCache).toHaveBeenCalledWith('guest_chats:guest-1');
    expect(result).toEqual({
      data: [
        {
          id: 'chat-1',
          title: 'Explain gravity',
          messageCount: 2,
          updatedAt: '2026-01-02T00:00:00.000Z',
        },
      ],
      pagination: { total: 1, limit: 10, offset: 0 },
    });
  });

  it('updates logged-in chat titles in the database', async () => {
    const updatedAt = new Date('2026-01-03T00:00:00.000Z');
    prismaMock.aiChat.findFirst.mockResolvedValueOnce({ id: 'chat-db-1' });
    prismaMock.aiChat.update.mockResolvedValueOnce({
      id: 'chat-db-1',
      title: 'Renamed chat',
      updatedAt,
      deletedAt: null,
    });

    const result = await ChatPersistenceService.updateChat({
      chatId: 'chat-db-1',
      userId: 'user-1',
      title: 'Renamed chat',
    });

    expect(prismaMock.aiChat.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'chat-db-1',
        userId: 'user-1',
        status: 'ACTIVE',
        deletedAt: null,
      },
      select: { id: true },
    });
    expect(prismaMock.aiChat.update).toHaveBeenCalledWith({
      where: { id: 'chat-db-1' },
      data: { title: 'Renamed chat' },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        deletedAt: true,
      },
    });
    expect(result).toEqual({
      id: 'chat-db-1',
      title: 'Renamed chat',
      updatedAt: updatedAt.toISOString(),
      deletedAt: null,
    });
  });

  it('soft deletes logged-in chats in the database', async () => {
    const deletedAt = new Date('2026-01-04T00:00:00.000Z');
    prismaMock.aiChat.findFirst.mockResolvedValueOnce({ id: 'chat-db-1' });
    prismaMock.aiChat.update.mockResolvedValueOnce({
      id: 'chat-db-1',
      title: 'Explain gravity',
      updatedAt: deletedAt,
      deletedAt,
    });

    const result = await ChatPersistenceService.updateChat({
      chatId: 'chat-db-1',
      userId: 'user-1',
      deletedAt,
    });

    expect(prismaMock.aiChat.update).toHaveBeenCalledWith({
      where: { id: 'chat-db-1' },
      data: { deletedAt },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        deletedAt: true,
      },
    });
    expect(result).toEqual({
      id: 'chat-db-1',
      title: 'Explain gravity',
      updatedAt: deletedAt.toISOString(),
      deletedAt: deletedAt.toISOString(),
    });
  });

  it('updates guest chat titles in Redis and the guest chat index', async () => {
    cacheMock.getCache
      .mockResolvedValueOnce({
        guestId: 'guest-1',
        title: 'Explain gravity',
        messageCount: 2,
        messages: [userMessage, assistantMessage],
        updatedAt: '2026-01-02T00:00:00.000Z',
      })
      .mockResolvedValueOnce([
        {
          id: 'chat-1',
          title: 'Explain gravity',
          messageCount: 2,
          updatedAt: '2026-01-02T00:00:00.000Z',
        },
      ]);

    const result = await ChatPersistenceService.updateChat({
      chatId: 'chat-1',
      guestId: 'guest-1',
      title: 'Renamed chat',
    });

    expect(cacheMock.setCache).toHaveBeenCalledWith(
      'chat-1',
      expect.objectContaining({ title: 'Renamed chat' }),
      { ttlSeconds: 86400 }
    );
    expect(cacheMock.setCache).toHaveBeenCalledWith(
      'guest_chats:guest-1',
      [
        expect.objectContaining({
          id: 'chat-1',
          title: 'Renamed chat',
          messageCount: 2,
        }),
      ],
      { ttlSeconds: 86400 }
    );
    expect(result).not.toBeNull();
    expect(result?.title).toBe('Renamed chat');
    expect(result?.deletedAt).toBeNull();
  });

  it('soft deletes guest chats from Redis and removes them from the index', async () => {
    const deletedAt = new Date('2026-01-04T00:00:00.000Z');
    cacheMock.getCache
      .mockResolvedValueOnce({
        guestId: 'guest-1',
        title: 'Explain gravity',
        messageCount: 2,
        messages: [userMessage, assistantMessage],
        updatedAt: '2026-01-02T00:00:00.000Z',
      })
      .mockResolvedValueOnce([
        {
          id: 'chat-1',
          title: 'Explain gravity',
          messageCount: 2,
          updatedAt: '2026-01-02T00:00:00.000Z',
        },
      ]);

    const result = await ChatPersistenceService.updateChat({
      chatId: 'chat-1',
      guestId: 'guest-1',
      deletedAt,
    });

    expect(cacheMock.setCache).toHaveBeenCalledWith(
      'chat-1',
      expect.objectContaining({ deletedAt: deletedAt.toISOString() }),
      { ttlSeconds: 86400 }
    );
    expect(cacheMock.setCache).toHaveBeenCalledWith('guest_chats:guest-1', [], {
      ttlSeconds: 86400,
    });
    expect(result).not.toBeNull();
    expect(result?.deletedAt).toBe(deletedAt.toISOString());
  });
});
