import { NextResponse } from 'next/server';
import * as z from 'zod';
import { errorResponse } from '@/lib/api/error-response';
import { withRoles } from '@/lib/api/middlewares';
import { prisma } from '@/lib/prisma';
import { QuizService } from '@/services/QuizService';

const routeParamsSchema = z.object({ quizId: z.string().uuid() });
const updateQuizDetailsSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().trim().optional(),
  lessonIds: z
    .array(z.string().uuid())
    .min(1, 'At least one lesson is required'),
  deliveryMode: z.enum(['INSTANT_FEEDBACK', 'POST_QUIZ_REVIEW']),
});

/**
 * @swagger
 * /api/v1/quizzes/{quizId}:
 *   patch:
 *     tags:
 *       - Quizzes
 *     summary: Update quiz details
 *     security:
 *       - SessionCookie: []
 *     responses:
 *       200:
 *         description: Quiz updated
 *       400:
 *         description: Invalid data
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Quiz not found
 */
export const PATCH = withRoles(
  ['TEACHER', 'ADMIN'],
  async (req, sessionData, { params }) => {
    try {
      const parsedParams = routeParamsSchema.safeParse(await params);
      if (!parsedParams.success) {
        return errorResponse(
          'VALIDATION_ERROR',
          'Invalid quiz ID',
          400,
          parsedParams.error.format()
        );
      }

      const parsedBody = updateQuizDetailsSchema.safeParse(await req.json());
      if (!parsedBody.success) {
        return errorResponse(
          'VALIDATION_ERROR',
          'Invalid quiz data',
          400,
          parsedBody.error.format()
        );
      }

      const quiz = await QuizService.updateDetails(
        parsedParams.data.quizId,
        sessionData.user.id,
        parsedBody.data
      );

      return NextResponse.json(quiz);
    } catch (error) {
      if (error instanceof Error && error.message === 'Quiz not found') {
        return errorResponse('QUIZ_NOT_FOUND', error.message, 404);
      }
      if (error instanceof Error && error.message === 'Forbidden') {
        return errorResponse('FORBIDDEN', error.message, 403);
      }
      if (
        error instanceof Error &&
        error.message === 'Some lessons do not belong to this course'
      ) {
        return errorResponse('VALIDATION_ERROR', error.message, 400);
      }
      return errorResponse('INTERNAL_ERROR', 'Failed to update quiz', 500);
    }
  }
);

/**
 * @swagger
 * /api/v1/quizzes/{quizId}:
 *   delete:
 *     tags:
 *       - Quizzes
 *     summary: Delete a quiz
 *     security:
 *       - SessionCookie: []
 *     responses:
 *       200:
 *         description: Quiz deleted
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Quiz not found
 */
export const DELETE = withRoles(
  ['TEACHER', 'ADMIN'],
  async (_req, sessionData, { params }) => {
    const parsed = routeParamsSchema.safeParse(await params);
    if (!parsed.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Invalid quiz ID',
        400,
        parsed.error.format()
      );
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: parsed.data.quizId },
      select: { id: true, course: { select: { ownerId: true } } },
    });
    if (!quiz) return errorResponse('QUIZ_NOT_FOUND', 'Quiz not found', 404);
    if (quiz.course.ownerId !== sessionData.user.id) {
      return errorResponse('FORBIDDEN', 'Forbidden', 403);
    }

    await prisma.quiz.delete({ where: { id: quiz.id } });
    return NextResponse.json({ message: 'Quiz deleted' });
  }
);
