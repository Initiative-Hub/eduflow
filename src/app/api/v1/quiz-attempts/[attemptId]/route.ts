import { NextResponse } from 'next/server';
import * as z from 'zod';
import { errorResponse } from '@/lib/api/error-response';
import { withAuth } from '@/lib/api/middlewares';
import {
  attemptIdParamsSchema,
  attemptProgressSchema,
} from '@/lib/validations/quiz-attempt.schema';
import { QuizAttemptService } from '@/services/QuizAttemptService';
import { QuizAttemptError } from '@/services/quiz-attempt-data';
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
export const GET = withAuth(async (_req, session, { params }) => {
  try {
    const { attemptId } = attemptIdParamsSchema.parse(await params);
    const attempt = await QuizAttemptService.get(session.user.id, attemptId);

    return NextResponse.json(attempt, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
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
export const PATCH = withAuth(async (req, session, { params }) => {
  try {
    const { attemptId } = attemptIdParamsSchema.parse(await params);
    const input = attemptProgressSchema.parse(await req.json());
    const attempt = await QuizAttemptService.save(
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
