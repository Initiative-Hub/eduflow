import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { embed, tool } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { CourseService } from '@/services/CourseService';
import { LESSON_CONTENT_EMBEDDING_MODEL } from '@/services/LessonContentEmbeddingService';
import { vectorToSqlLiteral } from '@/utils/lesson-content-rag';

type EnrolledCourse = {
  id: string;
  title: string;
  description: string | null;
  moduleCount: number;
  lessonCount: number;
  url: string;
};

type LessonChunkResult = {
  lessonId: string;
  lessonTitle: string;
  courseId: string;
  courseTitle: string;
  excerpt: string;
  url: string;
  similarity: number;
};

type SimilarChunkRow = {
  lesson_id: string;
  lesson_title: string;
  course_id: string;
  course_title: string;
  markdown: string;
  similarity: number;
};

const GUEST_SIGN_IN_HINT =
  'The user is not signed in. Politely let them know that retrieving their enrolled courses or lesson content requires signing in to EduFlow.';

async function embedQuery(query: string): Promise<number[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OpenRouter API key for lesson content embeddings');
  }

  const provider = createOpenRouter({ apiKey });

  const { embedding } = await embed({
    model: provider.textEmbeddingModel(LESSON_CONTENT_EMBEDDING_MODEL),
    value: query,
  });

  return embedding;
}

async function findSimilarChunks(
  queryEmbedding: number[],
  enrolledCourseIds: string[],
  limit = 5,
  similarityThreshold = 0.3,
  courseIdFilter?: string
): Promise<LessonChunkResult[]> {
  if (enrolledCourseIds.length === 0) return [];

  // When a courseId filter is given, scope to that course only — but only if
  // the user is actually enrolled in it (prevent leaking unenrolled content).
  const effectiveCourseIds =
    courseIdFilter && enrolledCourseIds.includes(courseIdFilter)
      ? [courseIdFilter]
      : enrolledCourseIds;

  const vectorLiteral = vectorToSqlLiteral(queryEmbedding);

  // Raw SQL because Prisma doesn't support pgvector operators
  const rows = await prisma.$queryRaw<SimilarChunkRow[]>`
    SELECT
      l.id          AS lesson_id,
      l.title       AS lesson_title,
      c.id          AS course_id,
      c.title       AS course_title,
      lcc.markdown  AS markdown,
      1 - (lcc.embedding <=> ${vectorLiteral}::vector) AS similarity
    FROM lesson_content_chunk lcc
    JOIN lesson    l ON l.id = lcc.lesson_id
    JOIN module    m ON m.id = l.module_id
    JOIN course    c ON c.id = m.course_id
    WHERE c.id = ANY(${effectiveCourseIds}::uuid[])
      AND c.deleted_at IS NULL
      AND (1 - (lcc.embedding <=> ${vectorLiteral}::vector)) >= ${similarityThreshold}
    ORDER BY lcc.embedding <=> ${vectorLiteral}::vector
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    lessonId: row.lesson_id,
    lessonTitle: row.lesson_title,
    courseId: row.course_id,
    courseTitle: row.course_title,
    excerpt: row.markdown.slice(0, 600),
    url: `/courses/${row.course_id}/lessons/${row.lesson_id}`,
    similarity: Number(row.similarity),
  }));
}

/**
 * Creates the two RAG tools scoped to an authenticated user.
 * For guest sessions, both tools return a sign-in hint so the LLM can
 * surface it gracefully instead of returning empty results silently.
 */
export function createChatTools(userId: string | undefined) {
  const getEnrolledCourses = tool({
    description:
      'Retrieves all courses the current user is enrolled in (as owner, teacher, or student). ' +
      'Call this tool when the user asks about their courses, what they are studying, or when you ' +
      'need course context before searching lesson content.',
    inputSchema: z.object({}),
    execute: async (): Promise<
      { courses: EnrolledCourse[] } | { error: string; hint: string }
    > => {
      if (!userId) {
        return {
          error: 'not_authenticated',
          hint: GUEST_SIGN_IN_HINT,
        };
      }

      const courses = await CourseService.getJoinedCourses(userId);

      return {
        courses: courses.map((course) => ({
          id: course.id,
          title: course.title,
          description: course.description,
          moduleCount: course._count.modules,
          lessonCount: 0, // module-level count only; lesson count requires deeper include
          url: `/courses/${course.id}`,
        })),
      };
    },
  });

  const searchLessonContent = tool({
    description:
      "Searches the user's enrolled lesson content using semantic similarity. " +
      'Use this tool when the user asks about topics, concepts, or material that might appear in their courses. ' +
      'Returns up to 5 relevant lesson excerpts with lesson URLs for citation. ' +
      'Always cite the returned lessons in your response using [1], [2], … notation. ' +
      'Pass courseId to narrow the search to a single course when the user is clearly asking about one specific course.',
    inputSchema: z.object({
      query: z
        .string()
        .min(1)
        .describe(
          "A concise search phrase derived from the user's question (e.g. 'binary search tree traversal', 'photosynthesis light reaction')"
        ),
      courseId: z
        .string()
        .uuid()
        .optional()
        .describe(
          'Optional UUID of a specific enrolled course to restrict the search to. Omit to search across all enrolled courses.'
        ),
    }),
    execute: async ({
      query,
      courseId,
    }): Promise<
      { results: LessonChunkResult[] } | { error: string; hint: string }
    > => {
      if (!userId) {
        return {
          error: 'not_authenticated',
          hint: GUEST_SIGN_IN_HINT,
        };
      }

      const courses = await CourseService.getJoinedCourses(userId);
      const enrolledCourseIds = courses.map((c) => c.id);

      if (enrolledCourseIds.length === 0) {
        return { results: [] };
      }

      const queryEmbedding = await embedQuery(query);
      const results = await findSimilarChunks(
        queryEmbedding,
        enrolledCourseIds,
        5,
        0.3,
        courseId
      );

      return { results };
    },
  });

  return { getEnrolledCourses, searchLessonContent };
}
