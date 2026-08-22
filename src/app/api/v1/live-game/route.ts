import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import {
  gameActorFromSession,
  gameQuizExceptionResponse,
  resolveRequestLiveGameSession,
} from '@/lib/game-quiz/http';
import { getGameSession } from '@/services/GameQuizSessionService';

/**
 * @swagger
 * /api/v1/live-game:
 *   get:
 *     summary: Get the participant's selected live game snapshot
 *     security: [{ SessionCookie: [] }]
 *     parameters:
 *       - in: header
 *         name: X-Live-Game-Session
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses: { 200: { description: Participant snapshot }, 400: { description: Missing or invalid live session ID }, 401: { description: Unauthorized }, 403: { description: Not a participant }, 404: { description: Game Session not found } }
 */
export const GET = withAuth(async (request, session) => {
  try {
    const liveSession = await resolveRequestLiveGameSession({
      audience: 'PARTICIPANT',
      request,
      session,
    });
    return NextResponse.json(
      await getGameSession(gameActorFromSession(session), liveSession.sessionId)
    );
  } catch (error) {
    return gameQuizExceptionResponse(error, 'Failed to load live game.');
  }
});
