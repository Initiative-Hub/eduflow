import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@/generated/prisma';
import { errorResponse } from '@/lib/api/error-response';
import { withAuth } from '@/lib/api/middlewares';
import { prisma } from '@/lib/prisma';

// ─── Validation Schemas ──────────────────────────────────────────────────────

const createQuizSchema = z.object({
  lessonId: z.string().min(1, 'Lesson ID is required'),
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
      orderBy: { createdAt: 'desc' },
    });

    // For quizzes with empty questions, populate from the question bank
    const populatedQuizzes = await Promise.all(
      quizzes.map(async (quiz) => {
        const questions = quiz.questions as unknown[];
        if (questions && Array.isArray(questions) && questions.length > 0) {
          return quiz;
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

        if (bankQuestions.length === 0) return quiz;

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

        return { ...quiz, questions: resolvedQuestions };
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
      lessonId,
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

    // ─── Populate questions from the question bank ─────────────────────────────
    let resolvedQuestions: unknown[] = questions ?? [];

    if (resolvedQuestions.length === 0) {
      // Build filter for question bank lookup
      const questionWhere: Record<string, unknown> = {
        courseId,
        category,
        subType,
      };

      if (selectionMethod === 'HAND_PICK' && selectedQuestionIds?.length) {
        // Hand-pick: fetch specific questions by ID
        questionWhere.id = { in: selectedQuestionIds };
      }

      const bankQuestions = await prisma.question.findMany({
        where: questionWhere,
        orderBy: { createdAt: 'desc' },
      });

      // Select questions based on method
      let selectedQuestions = bankQuestions;

      if (selectionMethod === 'RANDOM') {
        // Shuffle and take questionCount
        const shuffled = [...bankQuestions].sort(() => Math.random() - 0.5);
        selectedQuestions = shuffled.slice(0, questionCount);
      } else {
        // HAND_PICK or MANUAL_CREATE: take up to questionCount
        selectedQuestions = bankQuestions.slice(0, questionCount);
      }

      // Convert question bank entries to QuestionBlock format
      // answerData already contains the full QuestionBlock structure
      resolvedQuestions = selectedQuestions.map((q) => {
        const answerData = q.answerData as Record<string, unknown>;
        // answerData is the complete QuestionBlock; ensure explanation is included
        if (q.explanation && !answerData.explanation) {
          return { ...answerData, explanation: q.explanation };
        }
        return answerData;
      });
    }

    const quiz = await prisma.quiz.create({
      data: {
        courseId,
        lessonId,
        title,
        description,
        category,
        subType,
        deliveryMode,
        selectionMethod,
        questionCount,
        questions: resolvedQuestions as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json(quiz, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating quiz:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal Server Error', 500);
  }
});
