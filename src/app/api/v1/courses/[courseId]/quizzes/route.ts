import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@/generated/prisma';
import { errorResponse } from '@/lib/api/error-response';
import { withAuth } from '@/lib/api/middlewares';
import { prisma } from '@/lib/prisma';
import { QuizService } from '@/services/QuizService';

// ─── Validation Schemas ──────────────────────────────────────────────────────

const createQuizSchema = z.object({
  // Accept either a single `lessonId` (legacy) or `lessonIds` array
  lessonId: z.string().optional(),
  lessonIds: z.array(z.string()).optional(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  category: z.enum(['SELECTION_BASED', 'OPEN_ENDED']),
  subType: z.enum([
    'MULTIPLE_CHOICE',
    'TRUE_FALSE',
    'MATCHING',
    'ORDERING',
    'ESSAY',
    'FILL_IN_THE_BLANK',
    'DRAG_AND_DROP',
  ]),
  deliveryMode: z.enum(['INSTANT_FEEDBACK', 'POST_QUIZ_REVIEW']),
  selectionMethod: z.enum(['HAND_PICK', 'RANDOM', 'MANUAL_CREATE']),
  questionCount: z.number().int().min(1),
  questions: z.array(z.record(z.string(), z.unknown())).optional(),
  /** IDs of hand-picked questions (when selectionMethod is HAND_PICK) */
  selectedQuestionIds: z.array(z.string()).optional(),
});

// ─── GET /api/v1/courses/:courseId/quizzes ────────────────────────────────────

/**
 * @swagger
 * /api/v1/courses/{courseId}/quizzes:
 *   get:
 *     tags:
 *       - Quizzes
 *     summary: List quizzes for a course
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of quizzes
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const GET = withAuth(async (_req, _sessionData, { params }) => {
  try {
    const { courseId } = await params;

    const quizzes = await prisma.quiz.findMany({
      where: { courseId },
      include: {
        lessons: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Backward-compatible fallback during migration:
    // If a quiz has no lesson relation rows yet, try reading legacy `lesson_id`.
    let legacyLessonIdByQuizId = new Map<string, string>();
    try {
      const legacyRows = await prisma.$queryRaw<
        Array<{ id: string; lesson_id: string | null }>
      >`
        SELECT id, lesson_id
        FROM quiz
        WHERE course_id = ${courseId}
      `;

      legacyLessonIdByQuizId = new Map(
        legacyRows
          .filter((row) => typeof row.lesson_id === 'string' && row.lesson_id)
          .map((row) => [row.id, row.lesson_id as string])
      );
    } catch {
      // Ignore when legacy column/table shape is gone after full migration.
      legacyLessonIdByQuizId = new Map<string, string>();
    }

    // For quizzes with empty questions, populate from the question bank
    const populatedQuizzes = await Promise.all(
      quizzes.map(async (quiz) => {
        const questions = quiz.questions as unknown[];
        const relationLessonIds = quiz.lessons.map((lesson) => lesson.id);
        const lessonIds =
          relationLessonIds.length > 0
            ? relationLessonIds
            : legacyLessonIdByQuizId.get(quiz.id)
            ? [legacyLessonIdByQuizId.get(quiz.id) as string]
            : [];

        if (questions && Array.isArray(questions) && questions.length > 0) {
          return { ...quiz, lessonIds };
        }

        if (quiz.selectionMethod === 'MANUAL_CREATE') {
          return { ...quiz, lessonIds };
        }

        // Fetch matching questions from the bank
        const bankQuestions = await prisma.question.findMany({
          where: {
            courseId,
            category: quiz.category,
            subType: quiz.subType,
          },
          orderBy: { createdAt: 'desc' },
        });

        if (bankQuestions.length === 0) return { ...quiz, lessonIds };

        // Select questions based on method
        let selectedQuestions = bankQuestions;
        if (quiz.selectionMethod === 'RANDOM') {
          const shuffled = [...bankQuestions].sort(() => Math.random() - 0.5);
          selectedQuestions = shuffled.slice(0, quiz.questionCount);
        } else {
          selectedQuestions = bankQuestions.slice(0, quiz.questionCount);
        }

        // Convert to QuestionBlock format
        const resolvedQuestions = selectedQuestions.map((q) => {
          const answerData = q.answerData as Record<string, unknown>;
          if (q.explanation && !answerData.explanation) {
            return { ...answerData, explanation: q.explanation };
          }
          return answerData;
        });

        // Persist the populated questions so this only happens once
        if (resolvedQuestions.length > 0) {
          await prisma.quiz.update({
            where: { id: quiz.id },
            data: {
              questions: resolvedQuestions as unknown as Prisma.InputJsonValue,
            },
          });
        }

        return { ...quiz, lessonIds, questions: resolvedQuestions };
      })
    );

    return NextResponse.json(populatedQuizzes);
  } catch (error: unknown) {
    console.error('Error fetching quizzes:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal Server Error', 500);
  }
});

// ─── POST /api/v1/courses/:courseId/quizzes ───────────────────────────────────

/**
 * @swagger
 * /api/v1/courses/{courseId}/quizzes:
 *   post:
 *     tags:
 *       - Quizzes
 *     summary: Create a quiz in a course
 *     security:
 *       - SessionCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [lessonId, title, category, subType, deliveryMode, selectionMethod, questionCount]
 *             properties:
 *               lessonId:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               subType:
 *                 type: string
 *               deliveryMode:
 *                 type: string
 *               selectionMethod:
 *                 type: string
 *               questionCount:
 *                 type: integer
 *               questions:
 *                 type: array
 *     responses:
 *       201:
 *         description: Quiz created
 *       400:
 *         description: Invalid data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Course not found
 *       500:
 *         description: Internal server error
 */
export const POST = withAuth(async (req, _sessionData, { params }) => {
  try {
    const { courseId } = await params;
    const body = await req.json();

    const parsed = createQuizSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Invalid quiz data',
        400,
        parsed.error.format()
      );
    }

    // Verify course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });

    if (!course) {
      return errorResponse('COURSE_NOT_FOUND', 'Course not found', 404);
    }

    const {
      title,
      description,
      category,
      subType,
      deliveryMode,
      selectionMethod,
      questionCount,
      questions,
      selectedQuestionIds,
    } = parsed.data;

    const lessonIds =
      parsed.data.lessonIds ??
      (parsed.data.lessonId ? [parsed.data.lessonId] : []);

    if (!lessonIds || lessonIds.length === 0) {
      return errorResponse(
        'VALIDATION_ERROR',
        'At least one lessonId is required',
        400
      );
    }

    const quiz = await QuizService.createForCourse(courseId, {
      lessonIds,
      title,
      description,
      category,
      subType,
      deliveryMode,
      selectionMethod,
      questionCount,
      questions,
      selectedQuestionIds,
    });

    return NextResponse.json(quiz, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating quiz:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal Server Error', 500);
  }
});
