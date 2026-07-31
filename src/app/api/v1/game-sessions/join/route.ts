import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import {
  gameActorFromSession,
  gameQuizExceptionResponse,
  parseGameQuizBody,
  validationErrorResponse,
} from '@/lib/game-quiz/http';
import { joinGameSessionSchema } from '@/lib/game-quiz/schemas';
import {
  emitGameQuizHostProgressEvent,
  emitGameQuizSharedEvent,
} from '@/lib/realtime/game-quiz';
import { joinGameSession } from '@/services/GameQuizSessionService';

/**
 * @swagger
 * /api/v1/game-sessions/join:
 *   post:
 *     tags: [Game Sessions]
 *     summary: Join or reconnect to a live Game Session with a six-digit code
 *     security: [{ SessionCookie: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [joinCode] }
 *     responses:
 *       200: { description: Participant session snapshot }
 *       400: { description: Invalid join code }
 *       401: { description: Unauthorized }
 *       404: { description: Active session not found }
 *       409: { description: Joining locked }
 */
export const POST = withAuth(async (request, session) => {
  const parsed = await parseGameQuizBody(request, joinGameSessionSchema);
  if (!parsed.success) {
    return validationErrorResponse(
      parsed.error,
      'Invalid Game Session join data.'
    );
  }

  try {
    const joined = await joinGameSession(
      gameActorFromSession(session),
      parsed.data
    );
    if (!joined) {
      throw new Error(
        'Joined Game Session is not accessible to its participant.'
      );
    }
    await Promise.all([
      emitGameQuizSharedEvent({
        sessionId: joined.session.id,
        phase: joined.session.phase,
        stateVersion: joined.session.stateVersion,
      }),
      emitGameQuizHostProgressEvent({
        sessionId: joined.session.id,
        phase: joined.session.phase,
        stateVersion: joined.session.stateVersion,
        kind: 'ROSTER_CHANGED',
      }),
    ]);
    return NextResponse.json(joined);
  } catch (error) {
    return gameQuizExceptionResponse(error, 'Failed to join Game Session.');
  }
});
