import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import {
  gameActorFromSession,
  gameQuizExceptionResponse,
  parseGameQuizBody,
  resolveRequestLiveGameContext,
  validationErrorResponse,
} from '@/lib/game-quiz/http';
import { submitGameAnswerSchema } from '@/lib/game-quiz/schemas';
import {
  emitGameQuizHostProgressEvent,
  emitGameQuizPlayerEvent,
  emitGameQuizSharedEvent,
} from '@/lib/realtime/game-quiz';
import { submitGameAnswer } from '@/services/GameQuizAnswerService';
import { getGameSession } from '@/services/GameQuizSessionService';

/**
 * @swagger
 * /api/v1/live-game/answers:
 *   post:
 *     summary: Submit an answer to the context-selected participant game
 *     security: [{ SessionCookie: [] }]
 *     responses: { 200: { description: Answer accepted }, 400: { description: Invalid request }, 401: { description: Unauthorized }, 404: { description: Context unavailable }, 409: { description: Round closed or duplicate answer } }
 */
export const POST = withAuth(async (request, session) => {
  const parsed = await parseGameQuizBody(request, submitGameAnswerSchema);
  if (!parsed.success)
    return validationErrorResponse(parsed.error, 'Invalid answer submission.');
  try {
    const actor = gameActorFromSession(session);
    const context = await resolveRequestLiveGameContext({
      audience: 'PARTICIPANT',
      request,
      session,
    });
    const submitted = await submitGameAnswer(
      actor,
      context.sessionId,
      parsed.data
    );
    const snapshot = await getGameSession(actor, context.sessionId);
    const events = [
      emitGameQuizPlayerEvent({
        kind: 'ANSWER_SUBMITTED',
        participantId: submitted.participantId,
        sessionId: context.sessionId,
        stateVersion: snapshot.session.stateVersion,
      }),
      emitGameQuizHostProgressEvent({
        kind: 'ANSWER_PROGRESS_CHANGED',
        phase: snapshot.session.phase,
        sessionId: context.sessionId,
        stateVersion: snapshot.session.stateVersion,
      }),
    ];
    if (snapshot.session.phase === 'REVEAL') {
      events.push(
        emitGameQuizSharedEvent({
          phase: snapshot.session.phase,
          sessionId: context.sessionId,
          stateVersion: snapshot.session.stateVersion,
        })
      );
    }
    await Promise.all(events);
    return NextResponse.json(submitted);
  } catch (error) {
    return gameQuizExceptionResponse(error, 'Failed to submit Game Answer.');
  }
});
