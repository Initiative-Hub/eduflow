import { withAuth } from '@/lib/api/middlewares';
import { attemptResponse } from '@/lib/api/quiz-attempt-http';
import { QuizAttemptService } from '@/services/QuizAttemptService';
import {
  attemptIdParamsSchema,
  attemptCheckSchema,
} from '@/lib/validations/quiz-attempt.schema';
/**
 * @swagger
 * /api/v1/quiz-attempts/{attemptId}/check:
 *   post:
 *     tags: [Quiz Attempts]
 *     summary: Check and lock an instant-feedback answer
 *     security: [{ SessionCookie: [] }]
 *     parameters: [{ in: path, name: attemptId, required: true, schema: { type: string, format: uuid } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [revision, questionIndex, answer]
 *             properties:
 *               revision: { type: integer, minimum: 0 }
 *               questionIndex: { type: integer, minimum: 0 }
 *               answer: { type: object, required: [type], description: Validated StudentAnswer matching the frozen question type }
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
    return QuizAttemptService.check(
      session.user.id,
      attemptId,
      attemptCheckSchema.parse(await req.json())
    );
  })
);
