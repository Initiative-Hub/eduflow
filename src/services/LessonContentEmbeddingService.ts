import { randomUUID } from 'node:crypto';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { embedMany } from 'ai';
import { prisma } from '@/lib/prisma';
import { tiptapDocumentToMarkdown } from '@/lib/tiptap-markdown';
import { isTiptapDocument } from '@/utils/lesson-content';
import {
  chunkLessonMarkdown,
  createLessonContentHash,
  vectorToSqlLiteral,
} from '@/utils/lesson-content-rag';

export const LESSON_CONTENT_EMBEDDING_MODEL = 'openai/text-embedding-3-small';

type IndexLessonContentResult =
  | { status: 'missing' }
  | { status: 'cleared' }
  | { status: 'skipped'; reason: 'unchanged'; contentHash: string }
  | { status: 'indexed'; contentHash: string; chunkCount: number };

async function embedValues(values: string[]) {
  if (values.length === 0) return [];

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OpenRouter API key for lesson content embeddings');
  }

  const model = LESSON_CONTENT_EMBEDDING_MODEL;
  const provider = createOpenRouter({ apiKey });

  const { embeddings } = await embedMany({
    model: provider.textEmbeddingModel(model),
    values,
  });

  return embeddings;
}

export class LessonContentEmbeddingService {
  static async indexLessonContent(lessonId: string): Promise<IndexLessonContentResult> {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        content: true,
      },
    });

    if (!lesson) return { status: 'missing' };

    if (!isTiptapDocument(lesson.content)) {
      await prisma.lessonContentChunk.deleteMany({ where: { lessonId } });
      return { status: 'cleared' };
    }

    const markdown = tiptapDocumentToMarkdown(lesson.content);
    if (!markdown) {
      await prisma.lessonContentChunk.deleteMany({ where: { lessonId } });
      return { status: 'cleared' };
    }

    const contentHash = createLessonContentHash(markdown);
    const existingChunk = await prisma.lessonContentChunk.findFirst({
      where: { lessonId },
      select: { contentHash: true },
    });

    if (existingChunk?.contentHash === contentHash) {
      return { status: 'skipped', reason: 'unchanged', contentHash };
    }

    const chunks = chunkLessonMarkdown(markdown);
    const embeddings = await embedValues(
      chunks.map((chunk) => chunk.markdown)
    );

    if (embeddings.length !== chunks.length) {
      throw new Error(
        `Expected ${chunks.length} embeddings, received ${embeddings.length}`
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.lessonContentChunk.deleteMany({ where: { lessonId } });

      for (const chunk of chunks) {
        await tx.$executeRaw`
          INSERT INTO "lesson_content_chunk" (
            "id",
            "lesson_id",
            "content_hash",
            "chunk_index",
            "markdown",
            "token_count",
            "embedding_model",
            "embedding",
            "metadata",
            "created_at",
            "updated_at"
          ) VALUES (
            ${randomUUID()},
            ${lessonId},
            ${contentHash},
            ${chunk.chunkIndex},
            ${chunk.markdown},
            ${chunk.tokenCount},
            ${LESSON_CONTENT_EMBEDDING_MODEL},
            ${vectorToSqlLiteral(embeddings[chunk.chunkIndex] ?? [])}::vector,
            ${JSON.stringify(chunk.metadata)}::jsonb,
            NOW(),
            NOW()
          )
        `;
      }
    });

    return { status: 'indexed', contentHash, chunkCount: chunks.length };
  }
}
