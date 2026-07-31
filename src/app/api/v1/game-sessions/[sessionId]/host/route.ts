import { NextResponse } from 'next/server';
import { withRoles } from '@/lib/api/middlewares';
import {
  gameActorFromSession,
  gameQuizExceptionResponse,
  parseGameQuizBody,
  validationErrorResponse,
} from '@/lib/game-quiz/http';
import {
  gameSessionIdParamsSchema,
  hostCommandSchema,
} from '@/lib/game-quiz/schemas';
import { emitGameQuizSharedEvent } from '@/lib/realtime/game-quiz';
import { controlGameSession } from '@/services/GameQuizSessionService';

type RouteContext = { params: Promise<{ sessionId: string }> };

/**
 * @swagger
 * /api/v1/game-sessions/{sessionId}/host:
 *   post:
 *     tags: [Game Sessions]
 *     summary: Apply a host-controlled live session command
 *     security: [{ SessionCookie: [] }]
 *     parameters: [{ in: path, name: sessionId, required: true, schema: { type: string, format: uuid } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [action, expectedStateVersion] }
 *     responses:
 *       200: { description: Updated host snapshot }
 *       400: { description: Invalid command }
 *       403: { description: Session host access required }
 *       404: { description: Session not found }
 *       409: { description: Invalid phase or state version conflict }
 */
export const POST = withRoles(
  ['TEACHER', 'ADMIN'],
  async (request, session, { params }: RouteContext) => {
    const parsedParams = gameSessionIdParamsSchema.safeParse(await params);
    if (!parsedParams.success) {
      return validationErrorResponse(
        parsedParams.error,
        'Invalid Game Session ID.'
      );
    }
    const parsedBody = await parseGameQuizBody(request, hostCommandSchema);
    if (!parsedBody.success) {
      return validationErrorResponse(parsedBody.error, 'Invalid host command.');
    }

    try {
      const updated = await controlGameSession(
        gameActorFromSession(session),
        parsedParams.data.sessionId,
        parsedBody.data
      );
      await emitGameQuizSharedEvent({
        sessionId: updated.session.id,
        phase: updated.session.phase,
        stateVersion: updated.session.stateVersion,
      });
      return NextResponse.json(updated);
    } catch (error) {
      return gameQuizExceptionResponse(
        error,
        'Failed to control Game Session.'
      );
    }
  }
);
