import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@/generated/prisma';
import { errorResponse } from '@/lib/api/error-response';
import { withRoles } from '@/lib/api/middlewares';
import { prisma } from '@/lib/prisma';

// ─── Validation ──────────────────────────────────────────────────────────────

const routeParamsSchema = z.object({
  questionId: z.string().uuid(),
});
const updateQuestionSchema = z.object({
  prompt: z.string().min(1),
  answerData: z.record(z.string(), z.unknown()),
  explanation: z.string().nullable().optional(),
});

/**
 * @swagger
 * /api/v1/questions/{questionId}:
 *   put:
 *     tags:
 *       - Questions
 *     summary: Update a question-bank entry
 */
export const PUT = withRoles(
  ['TEACHER', 'ADMIN'],
  async (req, sessionData, { params }) => {
    const parsedParams = routeParamsSchema.safeParse(await params);
    const parsedBody = updateQuestionSchema.safeParse(await req.json());
    if (!parsedParams.success || !parsedBody.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid question data', 400);
    }

    const question = await prisma.question.findUnique({
      where: { id: parsedParams.data.questionId },
      select: { id: true, course: { select: { ownerId: true } } },
    });
    if (!question) {
      return errorResponse('QUESTION_NOT_FOUND', 'Question not found', 404);
    }
    if (question.course.ownerId !== sessionData.user.id) {
      return errorResponse('FORBIDDEN', 'Forbidden', 403);
    }

    const updatedQuestion = await prisma.question.update({
      where: { id: question.id },
      data: {
        prompt: parsedBody.data.prompt,
        answerData: parsedBody.data.answerData as Prisma.InputJsonValue,
        explanation: parsedBody.data.explanation ?? null,
      },
    });
    return NextResponse.json(updatedQuestion);
  }
);

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
export const DELETE = withRoles(
  ['TEACHER', 'ADMIN'],
  async (_req, sessionData, { params }) => {
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
        select: { id: true, course: { select: { ownerId: true } } },
      });

      if (!question) {
        return errorResponse('QUESTION_NOT_FOUND', 'Question not found', 404);
      }
      if (question.course.ownerId !== sessionData.user.id) {
        return errorResponse('FORBIDDEN', 'Forbidden', 403);
      }

      await prisma.question.delete({
        where: { id: questionId },
      });

      return NextResponse.json({ message: 'Question deleted' });
    } catch (error: unknown) {
      console.error('Error deleting question:', error);
      return errorResponse('INTERNAL_ERROR', 'Internal Server Error', 500);
    }
  }
);
