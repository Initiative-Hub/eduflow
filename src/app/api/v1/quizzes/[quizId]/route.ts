import { NextResponse } from 'next/server';
import { z } from 'zod';
import { errorResponse } from '@/lib/api/error-response';
import { withRoles } from '@/lib/api/middlewares';
import { prisma } from '@/lib/prisma';

const routeParamsSchema = z.object({ quizId: z.string().uuid() });

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
