import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import {
  gameQuizExceptionResponse,
  resolveRequestLiveGameSession,
} from '@/lib/game-quiz/http';
import { touchGameParticipantPresence } from '@/lib/game-quiz/presence';

/**
 * @swagger
 * /api/v1/live-game/presence:
 *   post:
 *     summary: Refresh participant presence for the selected game
 *     security: [{ SessionCookie: [] }]
 *     parameters:
 *       - in: header
 *         name: X-Live-Game-Session
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses: { 204: { description: Presence refreshed }, 400: { description: Missing or invalid live session ID }, 401: { description: Unauthorized }, 403: { description: Not a participant }, 404: { description: Game Session not found } }
 */
export const POST = withAuth(async (request, session) => {
  try {
    const liveSession = await resolveRequestLiveGameSession({
      audience: 'PARTICIPANT',
      request,
      session,
    });
    await touchGameParticipantPresence(
      liveSession.sessionId,
      liveSession.participantId!
    );
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return gameQuizExceptionResponse(error, 'Failed to refresh presence.');
  }
});
