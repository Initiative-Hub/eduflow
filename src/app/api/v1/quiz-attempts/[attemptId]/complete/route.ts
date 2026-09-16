import { NextResponse } from 'next/server';
import * as z from 'zod';
import { errorResponse } from '@/lib/api/error-response';
import { withAuth } from '@/lib/api/middlewares';
import {
  attemptCompleteSchema,
  attemptIdParamsSchema,
} from '@/lib/validations/quiz-attempt.schema';
import { QuizAttemptService } from '@/services/QuizAttemptService';
import { QuizAttemptError } from '@/services/quiz-attempt-data';
/**
 * @swagger
 * /api/v1/quiz-attempts/{attemptId}/complete:
 *   post:
 *     tags: [Quiz Attempts]
 *     summary: Finalize saved answers; duplicate completion returns the existing result
 *     security: [{ SessionCookie: [] }]
 *     parameters: [{ in: path, name: attemptId, required: true, schema: { type: string, format: uuid } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [revision]
 *             properties:
 *               revision: { type: integer, minimum: 0 }
 *     responses:
 *       200: { description: Successful operation; private and uncached }
 *       400: { description: Invalid UUID or request body }
 *       401: { description: Authentication required }
 *       403: { description: Course access denied or instant feedback unavailable }
 *       404: { description: Quiz or owned attempt not found }
 *       409: { description: Stale revision, locked answer, or completed attempt }
 *       500: { description: Unexpected server error }
 */
export const POST = withAuth(async (req, session, { params }) => {
  try {
    const { attemptId } = attemptIdParamsSchema.parse(await params);
    const input = attemptCompleteSchema.parse(await req.json());
    const attempt = await QuizAttemptService.complete(
      session.user.id,
      attemptId,
      input
    );

    return NextResponse.json(attempt);
  } catch (error) {
    let response: Response;
    if (error instanceof QuizAttemptError) {
      response = errorResponse(error.code, error.message, error.status);
    } else if (error instanceof z.ZodError || error instanceof SyntaxError) {
      response = errorResponse(
        'VALIDATION_ERROR',
        'Invalid attempt request.',
        400
      );
    } else {
      console.error('Quiz attempt request failed:', error);
      response = errorResponse(
        'INTERNAL_ERROR',
        'Unable to process the quiz attempt.',
        500
      );
    }
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }
});
