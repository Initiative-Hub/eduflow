import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import {
  gameActorFromSession,
  gameQuizExceptionResponse,
  resolveRequestLiveGameContext,
} from '@/lib/game-quiz/http';
import { getGameSession } from '@/services/GameQuizSessionService';

/**
 * @swagger
 * /api/v1/live-game:
 *   get:
 *     summary: Get the participant's context-selected live game snapshot
 *     security: [{ SessionCookie: [] }]
 *     responses: { 200: { description: Participant snapshot }, 400: { description: Missing context }, 401: { description: Unauthorized }, 404: { description: Context unavailable } }
 */
export const GET = withAuth(async (request, session) => {
  try {
    const context = await resolveRequestLiveGameContext({
      audience: 'PARTICIPANT',
      request,
      session,
    });
    return NextResponse.json(
      await getGameSession(gameActorFromSession(session), context.sessionId)
    );
  } catch (error) {
    return gameQuizExceptionResponse(error, 'Failed to load live game.');
  }
});
