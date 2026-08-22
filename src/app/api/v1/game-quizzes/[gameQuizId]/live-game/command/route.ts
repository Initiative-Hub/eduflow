import { NextResponse } from 'next/server';
import { withRoles } from '@/lib/api/middlewares';
import {
  gameActorFromSession,
  gameQuizExceptionResponse,
  parseGameQuizBody,
  resolveRequestLiveGameSession,
  validationErrorResponse,
} from '@/lib/game-quiz/http';
import {
  gameQuizIdParamsSchema,
  hostCommandSchema,
} from '@/lib/game-quiz/schemas';
import { emitGameQuizSharedEvent } from '@/lib/realtime/game-quiz';
import { controlGameSession } from '@/services/GameQuizSessionService';

type RouteContext = { params: Promise<{ gameQuizId: string }> };

/**
 * @swagger
 * /api/v1/game-quizzes/{gameQuizId}/live-game/command:
 *   post:
 *     summary: Apply a host command to the selected live game
 *     security: [{ SessionCookie: [] }]
 *     parameters:
 *       - in: header
 *         name: X-Live-Game-Session
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses: { 200: { description: Updated host snapshot }, 400: { description: Invalid request or live session ID }, 401: { description: Unauthorized }, 403: { description: Forbidden }, 404: { description: Game Session not found }, 409: { description: State conflict } }
 */
export const POST = withRoles(
  ['TEACHER', 'ADMIN'],
  async (request, session, { params }: RouteContext) => {
    const parsedParams = gameQuizIdParamsSchema.safeParse(await params);
    if (!parsedParams.success)
      return validationErrorResponse(
        parsedParams.error,
        'Invalid Game Quiz ID.'
      );
    const parsedBody = await parseGameQuizBody(request, hostCommandSchema);
    if (!parsedBody.success)
      return validationErrorResponse(parsedBody.error, 'Invalid host command.');
    try {
      const liveSession = await resolveRequestLiveGameSession({
        audience: 'HOST',
        expectedGameQuizId: parsedParams.data.gameQuizId,
        request,
        session,
      });
      const updated = await controlGameSession(
        gameActorFromSession(session),
        liveSession.sessionId,
        parsedBody.data
      );
      await emitGameQuizSharedEvent({
        phase: updated.session.phase,
        sessionId: liveSession.sessionId,
        stateVersion: updated.session.stateVersion,
      });
      return NextResponse.json(updated);
    } catch (error) {
      return gameQuizExceptionResponse(error, 'Failed to control live game.');
    }
  }
);
