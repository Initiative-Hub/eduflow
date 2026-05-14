import { NextResponse } from 'next/server';
import { z } from 'zod';
import { errorResponse } from '@/lib/api/error-response';
import { type AuthHandler, withAuth } from '@/lib/api/middlewares';
import { prisma } from '@/lib/prisma';

// ─── Validation ──────────────────────────────────────────────────────────────

const routeParamsSchema = z.object({
  quizId: z.string().min(1),
});

// ─── GET /api/v1/quizzes/:quizId/attempts ────────────────────────────────────

/**
 * @swagger
 * /api/v1/quizzes/{quizId}/attempts:
 *   get:
 *     tags:
 *       - Quiz Attempts
 *     summary: List quiz attempts for the authenticated user
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of attempts ordered by createdAt desc
 *       400:
 *         description: Invalid quiz ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Quiz not found
 *       500:
 *         description: Internal server error
 */
const handler: AuthHandler = async (_req, sessionData, { params }) => {
  try {
    const resolvedParams = await params;
    const parsed = routeParamsSchema.safeParse(resolvedParams);

    if (!parsed.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Invalid quiz ID',
        400,
        parsed.error.format()
      );
    }

    const { quizId } = parsed.data;
    const userId = sessionData.user.id;

    // Verify quiz exists
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: { id: true },
    });

    if (!quiz) {
      return errorResponse('QUIZ_NOT_FOUND', 'Quiz not found', 404);
    }

    // Fetch all attempts for this user and quiz, ordered by most recent first
    const attempts = await prisma.quizAttempt.findMany({
      where: {
        quizId,
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(attempts);
  } catch (error: unknown) {
    console.error('Error fetching quiz attempts:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal Server Error', 500);
  }
};

export const GET = withAuth(handler);
