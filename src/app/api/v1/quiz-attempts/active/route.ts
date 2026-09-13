import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api/error-response';
import { withAuth } from '@/lib/api/middlewares';
import { QuizAttemptService } from '@/services/QuizAttemptService';
import { QuizAttemptError } from '@/services/quiz-attempt-data';
/**
 * @swagger
 * /api/v1/quiz-attempts/active:
 *   get:
 *     tags: [Quiz Attempts]
 *     summary: List your active course quiz attempts
 *     security: [{ SessionCookie: [] }]
 *     responses:
 *       200: { description: Successful operation; private and uncached }
 *       400: { description: Invalid UUID or request body }
 *       401: { description: Authentication required }
 *       403: { description: Course access denied or instant feedback unavailable }
 *       404: { description: Quiz or owned attempt not found }
 *       409: { description: Stale revision, locked answer, or completed attempt }
 *       500: { description: Unexpected server error }
 */
export const GET = withAuth(async (_req, session) => {
  try {
    const attempts = await QuizAttemptService.active(session.user.id);

    return NextResponse.json(attempts, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    let response: Response;
    if (error instanceof QuizAttemptError) {
      response = errorResponse(error.code, error.message, error.status);
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
