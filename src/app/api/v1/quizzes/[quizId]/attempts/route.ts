import { NextResponse } from 'next/server';
import * as z from 'zod';
import { errorResponse } from '@/lib/api/error-response';
import { withAuth } from '@/lib/api/middlewares';
import { quizAttemptQuizParamsSchema } from '@/lib/validations/quiz-attempt.schema';
import { QuizAttemptService } from '@/services/QuizAttemptService';
import { QuizAttemptError } from '@/services/quiz-attempt-data';
/**
 * @swagger
 * /api/v1/quizzes/{quizId}/attempts:
 *   post:
 *     tags: [Quiz Attempts]
 *     summary: Start or resume your active attempt; no request body
 *     security: [{ SessionCookie: [] }]
 *     parameters: [{ in: path, name: quizId, required: true, schema: { type: string, format: uuid } }]
 *     responses:
 *       200: { description: Successful operation; private and uncached }
 *       400: { description: Invalid UUID or request body }
 *       401: { description: Authentication required }
 *       403: { description: Course access denied or instant feedback unavailable }
 *       404: { description: Quiz or owned attempt not found }
 *       409: { description: Stale revision, locked answer, or completed attempt }
 *       500: { description: Unexpected server error }
 */
export const POST = withAuth(async (_req, session, { params }) => {
  try {
    const { quizId } = quizAttemptQuizParamsSchema.parse(await params);
    const attempt = await QuizAttemptService.start(session.user.id, quizId);

    return NextResponse.json(attempt);
  } catch (error) {
    let response: Response;
    if (error instanceof QuizAttemptError) {
      response = errorResponse(error.code, error.message, error.status);
    } else if (error instanceof z.ZodError) {
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
