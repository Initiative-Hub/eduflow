import { NextResponse } from 'next/server';
import { z } from 'zod';
import { CourseEnrollmentStatus, type Prisma } from '@/generated/prisma';
import { errorResponse } from '@/lib/api/error-response';
import { withAuth } from '@/lib/api/middlewares';
import { prisma } from '@/lib/prisma';
import { calculateScore } from '@/lib/quiz-template/scoring';
import type {
  QuestionBlock,
  QuizSchema,
  StudentAnswers,
} from '@/lib/quiz-template/types';
import {
  countAnsweredQuestions,
  createQuizAttemptSnapshot,
} from '@/services/quiz-attempt-snapshot';
import { resolveReferencedQuestions } from '@/services/quiz-question-references';

// ─── Request Validation Schemas ──────────────────────────────────────────────

const multipleChoiceAnswerSchema = z.object({
  type: z.literal('multiple_choice'),
  selectedOptionId: z.string(),
});

const trueFalseAnswerSchema = z.object({
  type: z.literal('true_false'),
  selectedAnswer: z.boolean(),
});

const fillInTheBlankAnswerSchema = z.object({
  type: z.literal('fill_in_the_blank'),
  filledBlanks: z.record(z.string(), z.string()),
});

const matchingPairSchema = z.object({
  leftId: z.string(),
  rightId: z.string(),
});

const matchingAnswerSchema = z.object({
  type: z.literal('matching'),
  pairs: z.array(matchingPairSchema),
});

const orderingAnswerSchema = z.object({
  type: z.literal('ordering'),
  orderedItemIds: z.array(z.string()),
});

const dragAndDropAnswerSchema = z.object({
  type: z.literal('drag_and_drop'),
  placements: z.record(z.string(), z.string()),
});

const essayAnswerSchema = z.object({
  type: z.literal('essay'),
  text: z.string(),
  attachments: z.array(z.string()).optional(),
  teacherRubricText: z.string().optional(),
  teacherRubricAttachments: z.array(z.string()).optional(),
});

const studentAnswerSchema = z.discriminatedUnion('type', [
  multipleChoiceAnswerSchema,
  trueFalseAnswerSchema,
  fillInTheBlankAnswerSchema,
  matchingAnswerSchema,
  orderingAnswerSchema,
  dragAndDropAnswerSchema,
  essayAnswerSchema,
]);

const submitQuizSchema = z.object({
  quizId: z.string().min(1, 'quizId is required'),
  answers: z.record(z.string(), studentAnswerSchema),
});

// ─── Route Handler ───────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/quizzes/submit:
 *   post:
 *     tags:
 *       - Quizzes
 *     summary: Submit quiz answers for server-side scoring
 *     description: |
 *       Receives student answers and scores them against the authoritative
 *       question data stored in the database. Questions are fetched server-side
 *       by quizId to prevent client-side score manipulation.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quizId, answers]
 *             properties:
 *               quizId:
 *                 type: string
 *                 description: The quiz ID to submit answers for
 *               answers:
 *                 type: object
 *                 description: Student answers keyed by question index
 *     responses:
 *       200:
 *         description: Score result
 *       400:
 *         description: Invalid request payload or payload rejected
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - no course access
 *       404:
 *         description: Quiz not found
 *       500:
 *         description: Internal server error
 */
export const POST = withAuth(async (req, sessionData) => {
  try {
    const body = await req.json();

    // Reject payloads that include question blocks (security measure)
    if ('questions' in body && body.questions != null) {
      return errorResponse(
        'PAYLOAD_REJECTED',
        'Request must not include question blocks. Questions are fetched server-side.',
        400
      );
    }

    // Validate request body
    const parsed = submitQuizSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Invalid submission data',
        400,
        parsed.error.format()
      );
    }

    const { quizId, answers } = parsed.data;
    const userId = sessionData.user.id;

    // Fetch quiz from database
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        id: true,
        courseId: true,
        title: true,
        description: true,
        questions: true,
        deliveryMode: true,
        questionCount: true,
        quizQuestions: {
          orderBy: { orderIndex: 'asc' },
          select: {
            questionId: true,
            orderIndex: true,
            question: { select: { answerData: true, explanation: true } },
          },
        },
      },
    });

    if (!quiz) {
      return errorResponse('QUIZ_NOT_FOUND', 'Quiz not found', 404);
    }

    // Verify user has access to the quiz's course
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        memberId: userId,
        courseId: quiz.courseId,
        status: CourseEnrollmentStatus.ACTIVE,
      },
    });

    // Also allow course owner
    const course = await prisma.course.findUnique({
      where: { id: quiz.courseId },
      select: { ownerId: true },
    });

    if (!enrollment && course?.ownerId !== userId) {
      return errorResponse(
        'FORBIDDEN',
        'You do not have access to this course',
        403
      );
    }

    const questions = resolveReferencedQuestions(
      quiz.quizQuestions,
      quiz.questions
    ).questions as QuestionBlock[];

    // Convert the answers record (string keys) to a Map (number keys)
    const studentAnswers: StudentAnswers = new Map();
    for (const [indexStr, answer] of Object.entries(answers)) {
      const index = Number.parseInt(indexStr, 10);
      if (!Number.isNaN(index)) {
        studentAnswers.set(index, answer);
      }
    }

    // Build the quiz schema for scoring
    const schema: QuizSchema = {
      type: questions[0]?.type ?? 'mixed',
      constraints: { minQuestions: 1, maxQuestions: 100 },
      scoring: { pointsPerQuestion: 10 },
      questions,
    };

    // Score on the server using the authoritative question data
    const scoreResult = calculateScore(studentAnswers, schema);
    const quizSnapshot = createQuizAttemptSnapshot(quiz, questions);
    const answeredCount = countAnsweredQuestions(answers, questions.length);

    // Persist the quiz attempt
    await prisma.quizAttempt.create({
      data: {
        quizId,
        userId,
        answers: JSON.parse(JSON.stringify(answers)),
        quizSnapshot: quizSnapshot as unknown as Prisma.InputJsonValue,
        answeredCount,
        score: scoreResult.earnedPoints,
        maxScore: scoreResult.totalPoints,
        percentage: scoreResult.percentage,
        results: JSON.parse(JSON.stringify(scoreResult.questionResults)),
        hasPendingReview: scoreResult.hasPendingReview ?? false,
      },
    });

    // Return score result along with the full questions (including answers)
    // so the client can render the result review with correct/incorrect indicators
    return NextResponse.json({
      ...scoreResult,
      reviewQuestions: questions,
    });
  } catch (error: unknown) {
    console.error('Quiz submission error:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal Server Error', 500);
  }
});
