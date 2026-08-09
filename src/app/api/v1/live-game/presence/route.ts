import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import {
  gameQuizExceptionResponse,
  resolveRequestLiveGameContext,
} from '@/lib/game-quiz/http';
import { touchGameParticipantPresence } from '@/lib/game-quiz/presence';

/**
 * @swagger
 * /api/v1/live-game/presence:
 *   post:
 *     summary: Refresh participant presence for the context-selected game
 *     security: [{ SessionCookie: [] }]
 *     responses: { 204: { description: Presence refreshed }, 400: { description: Missing context }, 401: { description: Unauthorized }, 404: { description: Context unavailable } }
 */
export const POST = withAuth(async (request, session) => {
  try {
    const context = await resolveRequestLiveGameContext({
      audience: 'PARTICIPANT',
      request,
      session,
    });
    await touchGameParticipantPresence(
      context.sessionId,
      context.participantId!
    );
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return gameQuizExceptionResponse(error, 'Failed to refresh presence.');
  }
});
