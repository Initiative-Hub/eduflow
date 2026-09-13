import { withAuth } from '@/lib/api/middlewares';
import { attemptResponse } from '@/lib/api/quiz-attempt-http';
import { QuizAttemptService } from '@/services/QuizAttemptService';
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
export const GET = withAuth(async (_req, session) =>
  attemptResponse(() => QuizAttemptService.active(session.user.id))
);
