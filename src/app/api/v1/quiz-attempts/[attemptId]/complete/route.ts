import { withAuth } from '@/lib/api/middlewares';
import { attemptResponse } from '@/lib/api/quiz-attempt-http';
import { QuizAttemptService } from '@/services/QuizAttemptService';
import {
  attemptIdParamsSchema,
  attemptCompleteSchema,
} from '@/lib/validations/quiz-attempt.schema';
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
 *             required: [revision, completionReason]
 *             properties:
 *               revision: { type: integer, minimum: 0 }
 *               completionReason: { type: string, enum: [SUBMITTED, ENDED_EARLY], description: Ending early is allowed for the owner even after course access is revoked }
 *     responses:
 *       200: { description: Successful operation; private and uncached }
 *       400: { description: Invalid UUID or request body }
 *       401: { description: Authentication required }
 *       403: { description: Course access denied or instant feedback unavailable }
 *       404: { description: Quiz or owned attempt not found }
 *       409: { description: Stale revision, locked answer, or completed attempt }
 *       500: { description: Unexpected server error }
 */
export const POST = withAuth(async (req, session, { params }) =>
  attemptResponse(async () => {
    const { attemptId } = attemptIdParamsSchema.parse(await params);
    return QuizAttemptService.complete(
      session.user.id,
      attemptId,
      attemptCompleteSchema.parse(await req.json())
    );
  })
);
