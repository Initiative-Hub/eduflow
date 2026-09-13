import { withAuth } from '@/lib/api/middlewares';
import { attemptResponse } from '@/lib/api/quiz-attempt-http';
import { QuizAttemptService } from '@/services/QuizAttemptService';
import { quizAttemptQuizParamsSchema } from '@/lib/validations/quiz-attempt.schema';
/**
 * @swagger
 * /api/v1/quizzes/{quizId}/attempts:
 *   get:
 *     tags: [Quiz Attempts]
 *     summary: List your completed attempts ordered by completion time
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
export const GET = withAuth(async (_req, session, { params }) =>
  attemptResponse(async () => {
    const { quizId } = quizAttemptQuizParamsSchema.parse(await params);
    return QuizAttemptService.history(session.user.id, quizId);
  })
);
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
export const POST = withAuth(async (_req, session, { params }) =>
  attemptResponse(async () => {
    const { quizId } = quizAttemptQuizParamsSchema.parse(await params);
    return QuizAttemptService.start(session.user.id, quizId);
  })
);
