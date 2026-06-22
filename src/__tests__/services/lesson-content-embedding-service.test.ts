import { embedMany } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { tiptapDocumentToMarkdown } from '@/lib/tiptap-markdown';
import {
  LESSON_CONTENT_EMBEDDING_MODEL,
  LessonContentEmbeddingService,
} from '@/services/LessonContentEmbeddingService';
import type { TiptapDocument } from '@/utils/lesson-content';
import { createLessonContentHash } from '@/utils/lesson-content-rag';

const mocks = vi.hoisted(() => {
  const transactionClient = {
    $executeRaw: vi.fn(),
    lessonContentChunk: {
      deleteMany: vi.fn(),
    },
  };

  return {
    openrouter: {
      textEmbeddingModel: vi.fn(() => 'embedding-model'),
    },
    prisma: {
      $transaction: vi.fn((callback) => callback(transactionClient)),
      lesson: {
        findUnique: vi.fn(),
      },
      lessonContentChunk: {
        deleteMany: vi.fn(),
        findFirst: vi.fn(),
      },
    },
    transactionClient,
    embedMany: vi.fn(),
  };
});

vi.mock('ai', () => ({
  embedMany: mocks.embedMany,
}));

vi.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: vi.fn(() => mocks.openrouter),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: mocks.prisma,
}));

const lesson = prisma.lesson as unknown as {
  findUnique: ReturnType<typeof vi.fn>;
};
const lessonContentChunk = prisma.lessonContentChunk as unknown as {
  deleteMany: ReturnType<typeof vi.fn>;
  findFirst: ReturnType<typeof vi.fn>;
};
const transaction = prisma.$transaction as unknown as ReturnType<typeof vi.fn>;
const mockEmbedMany = embedMany as unknown as ReturnType<typeof vi.fn>;
const mockCreateOpenRouter = createOpenRouter as unknown as ReturnType<
  typeof vi.fn
>;

describe('LessonContentEmbeddingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENROUTER_API_KEY = 'test-key';
    mocks.transactionClient.$executeRaw.mockResolvedValue(1);
    mocks.transactionClient.lessonContentChunk.deleteMany.mockResolvedValue({
      count: 1,
    });
    lessonContentChunk.deleteMany.mockResolvedValue({ count: 1 });
  });

  it('skips indexing when existing chunks match the current content hash', async () => {
    const content: TiptapDocument = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Stored lesson content.' }],
        },
      ],
    };
    const contentHash = createLessonContentHash(
      tiptapDocumentToMarkdown(content)
    );

    lesson.findUnique.mockResolvedValue({ content, id: 'lesson-1' });
    lessonContentChunk.findFirst.mockResolvedValue({ contentHash });

    const result =
      await LessonContentEmbeddingService.indexLessonContent('lesson-1');

    expect(result).toEqual({
      contentHash,
      reason: 'unchanged',
      status: 'skipped',
    });
    expect(mockEmbedMany).not.toHaveBeenCalled();
  });

  it('clears chunks for empty lesson content', async () => {
    lesson.findUnique.mockResolvedValue({
      content: { type: 'doc', content: [] },
      id: 'lesson-1',
    });

    const result =
      await LessonContentEmbeddingService.indexLessonContent('lesson-1');

    expect(result).toEqual({ status: 'cleared' });
    expect(lessonContentChunk.deleteMany).toHaveBeenCalledWith({
      where: { lessonId: 'lesson-1' },
    });
  });

  it('embeds chunks and replaces old rows in a transaction', async () => {
    const content: TiptapDocument = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Stored lesson content.' }],
        },
      ],
    };

    lesson.findUnique.mockResolvedValue({ content, id: 'lesson-1' });
    lessonContentChunk.findFirst.mockResolvedValue(null);
    mockEmbedMany.mockResolvedValue({ embeddings: [[0.1, -0.2, 0.3]] });

    const result =
      await LessonContentEmbeddingService.indexLessonContent('lesson-1');

    expect(result).toMatchObject({
      chunkCount: 1,
      status: 'indexed',
    });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(
      mocks.transactionClient.lessonContentChunk.deleteMany
    ).toHaveBeenCalledWith({ where: { lessonId: 'lesson-1' } });
    expect(mocks.transactionClient.$executeRaw).toHaveBeenCalledTimes(1);
    expect(mockCreateOpenRouter).toHaveBeenCalledWith({ apiKey: 'test-key' });
    expect(mocks.openrouter.textEmbeddingModel).toHaveBeenCalledWith(
      LESSON_CONTENT_EMBEDDING_MODEL
    );

    const [
      _strings,
      _id,
      lessonId,
      _hash,
      chunkIndex,
      markdown,
      tokenCount,
      model,
      vector,
    ] = mocks.transactionClient.$executeRaw.mock.calls[0];

    expect(lessonId).toBe('lesson-1');
    expect(chunkIndex).toBe(0);
    expect(markdown).toBe('Stored lesson content.');
    expect(tokenCount).toBe(3);
    expect(model).toBe(LESSON_CONTENT_EMBEDDING_MODEL);
    expect(vector).toBe('[0.1,-0.2,0.3]');
  });
});
