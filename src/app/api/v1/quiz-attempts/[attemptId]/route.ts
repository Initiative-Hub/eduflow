import { withAuth } from '@/lib/api/middlewares';
import { attemptResponse } from '@/lib/api/quiz-attempt-http';
import { QuizAttemptService } from '@/services/QuizAttemptService';
import {
  attemptIdParamsSchema,
  attemptProgressSchema,
} from '@/lib/validations/quiz-attempt.schema';
/**
 * @swagger
 * /api/v1/quiz-attempts/{attemptId}:
 *   get:
 *     tags: [Quiz Attempts]
 *     summary: Load owned attempt progress or completed results
 *     security: [{ SessionCookie: [] }]
 *     parameters: [{ in: path, name: attemptId, required: true, schema: { type: string, format: uuid } }]
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
    const { attemptId } = attemptIdParamsSchema.parse(await params);
    return QuizAttemptService.get(session.user.id, attemptId);
  })
);
/**
 * @swagger
 * /api/v1/quiz-attempts/{attemptId}:
 *   patch:
 *     tags: [Quiz Attempts]
 *     summary: Save progress using optimistic revision validation
 *     security: [{ SessionCookie: [] }]
 *     parameters: [{ in: path, name: attemptId, required: true, schema: { type: string, format: uuid } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [revision, answers, currentQuestionIndex]
 *             properties:
 *               revision: { type: integer, minimum: 0 }
 *               currentQuestionIndex: { type: integer, minimum: 0 }
 *               answers:
 *                 type: object
 *                 description: Question-index keys mapped to discriminated StudentAnswer objects (multiple_choice, true_false, fill_in_the_blank, matching, ordering, drag_and_drop, essay); type must match the frozen question.
 *                 additionalProperties: { type: object, required: [type], properties: { type: { type: string } } }
 *     responses:
 *       200: { description: Successful operation; private and uncached }
 *       400: { description: Invalid UUID or request body }
 *       401: { description: Authentication required }
 *       403: { description: Course access denied or instant feedback unavailable }
 *       404: { description: Quiz or owned attempt not found }
 *       409: { description: Stale revision, locked answer, or completed attempt }
 *       500: { description: Unexpected server error }
 */
export const PATCH = withAuth(async (req, session, { params }) =>
  attemptResponse(async () => {
    const { attemptId } = attemptIdParamsSchema.parse(await params);
    return QuizAttemptService.save(
      session.user.id,
      attemptId,
      attemptProgressSchema.parse(await req.json())
    );
  })
);
