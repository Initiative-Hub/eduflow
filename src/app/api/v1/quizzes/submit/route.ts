import { NextResponse } from 'next/server';
import * as z from 'zod';
import { errorResponse } from '@/lib/api/error-response';
import { withAuth } from '@/lib/api/middlewares';
import { attemptCompleteSchema } from '@/lib/validations/quiz-attempt.schema';
import { QuizAttemptService } from '@/services/QuizAttemptService';
import { QuizAttemptError } from '@/services/quiz-attempt-data';

const schema = attemptCompleteSchema.extend({
  attemptId: z.uuid(),
  quizId: z.uuid().optional(),
});
/**
 * @swagger
 * /api/v1/quizzes/submit:
 *   post:
 *     tags: [Quiz Attempts]
 *     summary: Complete an existing attempt; save answers through the progress endpoint first
 *     security: [{ SessionCookie: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [attemptId, revision, completionReason]
 *             properties:
 *               revision: { type: integer, minimum: 0 }
 *               completionReason: { type: string, enum: [SUBMITTED, ENDED_EARLY], description: Ending early is allowed for the owner even after course access is revoked }
 *               attemptId: { type: string, format: uuid, description: Required existing owned attempt ID }
 *               quizId: { type: string, format: uuid, description: Optional quiz consistency check }
 *     responses:
 *       200: { description: Successful operation; private and uncached }
 *       400: { description: Invalid UUID or request body }
 *       401: { description: Authentication required }
 *       403: { description: Course access denied or instant feedback unavailable }
 *       404: { description: Quiz or owned attempt not found }
 *       409: { description: Stale revision, locked answer, or completed attempt }
 *       500: { description: Unexpected server error }
 */
export const POST = withAuth(async (req, session) => {
  try {
    const input = schema.parse(await req.json());
    if (input.quizId) {
      const attempt = await QuizAttemptService.get(
        session.user.id,
        input.attemptId
      );
      if (attempt.quizId !== input.quizId)
        throw new z.ZodError([
          { code: 'custom', path: ['quizId'], message: 'Quiz mismatch' },
        ]);
    }
    const attempt = await QuizAttemptService.complete(
      session.user.id,
      input.attemptId,
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
