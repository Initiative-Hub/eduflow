import { NextResponse } from 'next/server';
import { z } from 'zod';
import { errorResponse } from '@/lib/api/error-response';
import { withAuth } from '@/lib/api/middlewares';
import { prisma } from '@/lib/prisma';

// ─── Validation ──────────────────────────────────────────────────────────────

const routeParamsSchema = z.object({
  questionId: z.string().min(1),
});

// ─── DELETE /api/v1/questions/:questionId ─────────────────────────────────────

/**
 * @swagger
 * /api/v1/questions/{questionId}:
 *   delete:
 *     tags:
 *       - Questions
 *     summary: Delete a question
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Question deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Question not found
 *       500:
 *         description: Internal server error
 */
export const DELETE = withAuth(async (_req, _sessionData, { params }) => {
  try {
    const resolvedParams = await params;
    const parsed = routeParamsSchema.safeParse(resolvedParams);

    if (!parsed.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Invalid question ID',
        400,
        parsed.error.format()
      );
    }

    const { questionId } = parsed.data;

    // Verify question exists
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true },
    });

    if (!question) {
      return errorResponse('QUESTION_NOT_FOUND', 'Question not found', 404);
    }

    await prisma.question.delete({
      where: { id: questionId },
    });

    return NextResponse.json({ message: 'Question deleted' });
  } catch (error: unknown) {
    console.error('Error deleting question:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal Server Error', 500);
  }
});
