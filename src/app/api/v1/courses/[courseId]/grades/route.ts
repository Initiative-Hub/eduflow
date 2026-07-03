import { NextResponse } from 'next/server';
import { z } from 'zod';
import { errorResponse } from '@/lib/api/error-response';
import { type AuthHandler, withAuth } from '@/lib/api/middlewares';
import { prisma } from '@/lib/prisma';
import { CourseService } from '@/services/CourseService';
import {
  countAnsweredQuestions,
  type QuizAttemptSnapshot,
} from '@/services/quiz-attempt-snapshot';
import { resolveReferencedQuestions } from '@/services/quiz-question-references';

const routeParamsSchema = z.object({ courseId: z.string().uuid() });

/**
 * @swagger
 * /api/v1/courses/{courseId}/grades:
 *   get:
 *     tags:
 *       - Quiz Attempts
 *     summary: List the authenticated student's quiz submissions for a course
 *     security:
 *       - SessionCookie: []
 *     responses:
 *       200:
 *         description: Student-scoped quiz submissions ordered newest first
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Course access denied
 */
const handler: AuthHandler = async (_req, sessionData, { params }) => {
  const parsed = routeParamsSchema.safeParse(await params);
  if (!parsed.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      'Invalid course ID',
      400,
      parsed.error.format()
    );
  }

  const { courseId } = parsed.data;
  const userId = sessionData.user.id;
  if (!(await CourseService.isMember(courseId, userId))) {
    return errorResponse(
      'FORBIDDEN',
      'You do not have access to this course',
      403
    );
  }

  const attempts = await prisma.quizAttempt.findMany({
    where: { userId, quiz: { courseId } },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      quiz: {
        select: {
          title: true,
          description: true,
          subType: true,
          deliveryMode: true,
          questions: true,
          quizQuestions: {
            orderBy: { orderIndex: 'asc' },
            select: {
              questionId: true,
              orderIndex: true,
              question: { select: { answerData: true, explanation: true } },
            },
          },
        },
      },
    },
  });

  return NextResponse.json(
    attempts.map(({ quiz, quizSnapshot, ...attempt }) => {
      const fallbackQuestions = resolveReferencedQuestions(
        quiz.quizQuestions,
        quiz.questions
      ).questions;
      const snapshot = (quizSnapshot as QuizAttemptSnapshot | null) ?? {
        title: quiz.title,
        description: quiz.description ?? '',
        type: quiz.subType,
        deliveryMode: quiz.deliveryMode,
        questions: fallbackQuestions,
      };

      return {
        ...attempt,
        answeredCount:
          quizSnapshot === null
            ? countAnsweredQuestions(
                attempt.answers as Record<string, unknown>,
                snapshot.questions.length
              )
            : attempt.answeredCount,
        quizSnapshot: snapshot,
        isLegacySnapshot: quizSnapshot === null,
      };
    })
  );
};

export const GET = withAuth(handler);
