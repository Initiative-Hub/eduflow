import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import {
  gameActorFromSession,
  gameQuizExceptionResponse,
  parseGameQuizBody,
  validationErrorResponse,
} from '@/lib/game-quiz/http';
import {
  gameSessionIdParamsSchema,
  submitGameAnswerSchema,
} from '@/lib/game-quiz/schemas';
import { getGameSession } from '@/services/GameQuizSessionService';
import { submitGameAnswer } from '@/services/GameQuizAnswerService';
import {
  emitGameQuizHostProgressEvent,
  emitGameQuizPlayerEvent,
} from '@/lib/realtime/game-quiz';

type RouteContext = { params: Promise<{ sessionId: string }> };

/**
 * @swagger
 * /api/v1/game-sessions/{sessionId}/answers:
 *   post:
 *     tags: [Game Sessions]
 *     summary: Submit one answer for the currently open Game Session round
 *     security: [{ SessionCookie: [] }]
 *     parameters: [{ in: path, name: sessionId, required: true, schema: { type: string, format: uuid } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [roundId, selectedOptionId, idempotencyKey] }
 *     responses:
 *       200: { description: Submission accepted or replayed idempotently }
 *       400: { description: Invalid answer payload or option }
 *       401: { description: Unauthorized }
 *       403: { description: Session participant access required }
 *       404: { description: Session not found }
 *       409: { description: Late, duplicate, stale, or invalid-phase submission }
 */
export const POST = withAuth(
  async (request, session, { params }: RouteContext) => {
    const parsedParams = gameSessionIdParamsSchema.safeParse(await params);
    if (!parsedParams.success) {
      return validationErrorResponse(
        parsedParams.error,
        'Invalid Game Session ID.'
      );
    }
    const parsedBody = await parseGameQuizBody(request, submitGameAnswerSchema);
    if (!parsedBody.success) {
      return validationErrorResponse(
        parsedBody.error,
        'Invalid answer submission.'
      );
    }

    try {
      const submitted = await submitGameAnswer(
        gameActorFromSession(session),
        parsedParams.data.sessionId,
        parsedBody.data
      );
      const snapshot = await getGameSession(
        gameActorFromSession(session),
        parsedParams.data.sessionId
      );
      await Promise.all([
        emitGameQuizPlayerEvent({
          sessionId: parsedParams.data.sessionId,
          participantId: submitted.participantId,
          stateVersion: snapshot.session.stateVersion,
          kind: 'ANSWER_SUBMITTED',
        }),
        emitGameQuizHostProgressEvent({
          sessionId: parsedParams.data.sessionId,
          phase: snapshot.session.phase,
          stateVersion: snapshot.session.stateVersion,
          kind: 'ANSWER_PROGRESS_CHANGED',
        }),
      ]);
      return NextResponse.json(submitted);
    } catch (error) {
      return gameQuizExceptionResponse(error, 'Failed to submit Game Answer.');
    }
  }
);
