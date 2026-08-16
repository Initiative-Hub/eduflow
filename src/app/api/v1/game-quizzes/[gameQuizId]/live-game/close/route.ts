import { NextResponse } from 'next/server';
import { withRoles } from '@/lib/api/middlewares';
import {
  gameActorFromSession,
  gameQuizExceptionResponse,
  resolveRequestLiveGameSession,
  validationErrorResponse,
} from '@/lib/game-quiz/http';
import { gameQuizIdParamsSchema } from '@/lib/game-quiz/schemas';
import { emitGameQuizSharedEvent } from '@/lib/realtime/game-quiz';
import { closeGameSession } from '@/services/GameQuizSessionService';

type RouteContext = { params: Promise<{ gameQuizId: string }> };

/**
 * @swagger
 * /api/v1/game-quizzes/{gameQuizId}/live-game/close:
 *   post:
 *     summary: End the selected host live game
 *     security: [{ SessionCookie: [] }]
 *     parameters:
 *       - in: path
 *         name: gameQuizId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: header
 *         name: X-Live-Game-Session
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses: { 200: { description: Ended host snapshot }, 400: { description: Invalid request or live session ID }, 401: { description: Unauthorized }, 403: { description: Forbidden }, 404: { description: Game Session not found } }
 */
export const POST = withRoles(
  ['TEACHER', 'ADMIN'],
  async (request, session, { params }: RouteContext) => {
    const parsed = gameQuizIdParamsSchema.safeParse(await params);
    if (!parsed.success)
      return validationErrorResponse(parsed.error, 'Invalid Game Quiz ID.');
    try {
      const liveSession = await resolveRequestLiveGameSession({
        audience: 'HOST',
        expectedGameQuizId: parsed.data.gameQuizId,
        request,
        session,
      });
      const updated = await closeGameSession(
        gameActorFromSession(session),
        liveSession.sessionId,
        'HOST_LEFT'
      );
      await emitGameQuizSharedEvent({
        phase: updated.session.phase,
        sessionId: liveSession.sessionId,
        stateVersion: updated.session.stateVersion,
      });
      return NextResponse.json(updated);
    } catch (error) {
      return gameQuizExceptionResponse(error, 'Failed to close live game.');
    }
  }
);
