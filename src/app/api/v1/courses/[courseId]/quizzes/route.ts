import { NextResponse } from 'next/server';
import { z } from 'zod';
import { errorResponse } from '@/lib/api/error-response';
import { withAuth } from '@/lib/api/middlewares';
import { getCoursePermissions } from '@/lib/permissions/course-permission';
import { COURSE_PERMISSION } from '@/lib/permissions/permission-keys';
import { prisma } from '@/lib/prisma';
import { questionBlockSchema } from '@/lib/validations/quiz.schema';
import { QuizService } from '@/services/QuizService';
import { resolveReferencedQuestions } from '@/services/quiz-question-references';

// ─── Validation Schemas ──────────────────────────────────────────────────────

const questionSubTypeSchema = z.enum([
  'MULTIPLE_CHOICE',
  'TRUE_FALSE',
  'MATCHING',
  'ORDERING',
  'ESSAY',
  'FILL_IN_THE_BLANK',
  'DRAG_AND_DROP',
]);

const createQuizSchema = z
  .object({
    lessonIds: z.array(z.string()).min(1, 'At least one lesson is required'),
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    questionCounts: z.partialRecord(
      questionSubTypeSchema,
      z.number().int().min(0).max(50)
    ),
    deliveryMode: z.enum(['INSTANT_FEEDBACK', 'POST_QUIZ_REVIEW']),
    selectionMethod: z.enum(['HAND_PICK', 'RANDOM', 'MANUAL_CREATE']),
    questionCount: z.number().int().min(0),
    questions: z.array(questionBlockSchema).optional(),
    questionIds: z.array(z.string().uuid().nullable()).optional(),
    /** IDs of hand-picked questions (when selectionMethod is HAND_PICK) */
    selectedQuestionIds: z.array(z.string()).optional(),
  })
  .refine(
    (data) =>
      !data.questionIds || data.questionIds.length === data.questions?.length,
    {
      message: 'questions and questionIds must have the same length',
      path: ['questionIds'],
    }
  );

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
export const GET = withAuth(async (_req, sessionData, { params }) => {
  try {
    const { courseId } = await params;
    const permissions = await getCoursePermissions(
      sessionData.user.id,
      courseId
    );
    if (permissions.withoutPermission(COURSE_PERMISSION.ASSESSMENTS_VIEW)) {
      return errorResponse('FORBIDDEN', 'Forbidden', 403);
    }

    const quizzes = await prisma.quiz.findMany({
      where: { courseId },
      include: {
        lessonQuizzes: {
          select: {
            lesson: { select: { id: true } },
          },
        },
        quizQuestions: {
          orderBy: { orderIndex: 'asc' },
          select: {
            questionId: true,
            orderIndex: true,
            question: { select: { answerData: true, explanation: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const populatedQuizzes = quizzes.map((quiz) => {
      const { lessonQuizzes, quizQuestions, ...quizData } = quiz;
      const resolved = resolveReferencedQuestions(
        quizQuestions,
        quiz.questions
      );
      return {
        ...quizData,
        lessonIds: lessonQuizzes.map(({ lesson }) => lesson.id),
        ...resolved,
      };
    });

    return NextResponse.json(populatedQuizzes);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return errorResponse('FORBIDDEN', 'Forbidden', 403);
    }
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
 *             required: [lessonIds, title, questionCounts, deliveryMode, selectionMethod, questionCount]
 *             properties:
 *               lessonIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               questionCounts:
 *                 type: object
 *                 additionalProperties:
 *                   type: integer
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
export const POST = withAuth(async (req, sessionData, { params }) => {
  try {
    const { courseId } = await params;
    const permissions = await getCoursePermissions(
      sessionData.user.id,
      courseId
    );
    if (permissions.withoutPermission(COURSE_PERMISSION.ASSESSMENTS_CREATE)) {
      return errorResponse('FORBIDDEN', 'Forbidden', 403);
    }
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
      lessonIds,
      title,
      description,
      questionCounts,
      deliveryMode,
      selectionMethod,
      questionCount,
      questions,
      questionIds,
      selectedQuestionIds,
    } = parsed.data;

    const quiz = await QuizService.createForCourse(
      courseId,
      sessionData.user.id,
      {
        lessonIds,
        title,
        description,
        questionCounts,
        deliveryMode,
        selectionMethod,
        questionCount,
        questions,
        questionIds,
        selectedQuestionIds,
      }
    );

    return NextResponse.json(quiz, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating quiz:', error);
    if (error instanceof Error && error.message === 'Forbidden') {
      return errorResponse('FORBIDDEN', 'Forbidden', 403);
    }
    return errorResponse('INTERNAL_ERROR', 'Internal Server Error', 500);
  }
});
