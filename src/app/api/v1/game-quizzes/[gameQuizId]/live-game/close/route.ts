import { NextResponse } from 'next/server';
import { withRoles } from '@/lib/api/middlewares';
import {
  gameActorFromSession,
  gameQuizExceptionResponse,
  resolveRequestLiveGameContext,
  validationErrorResponse,
} from '@/lib/game-quiz/http';
import { gameQuizIdParamsSchema } from '@/lib/game-quiz/schemas';
import { emitGameQuizSharedEvent } from '@/lib/realtime/game-quiz';
import { closeGameSession } from '@/services/GameQuizSessionService';

type RouteContext = { params: Promise<{ gameQuizId: string }> };

export const POST = withRoles(
  ['TEACHER', 'ADMIN'],
  async (request, session, { params }: RouteContext) => {
    const parsed = gameQuizIdParamsSchema.safeParse(await params);
    if (!parsed.success)
      return validationErrorResponse(parsed.error, 'Invalid Game Quiz ID.');
    try {
      const context = await resolveRequestLiveGameContext({
        audience: 'HOST',
        expectedGameQuizId: parsed.data.gameQuizId,
        request,
        session,
      });
      const updated = await closeGameSession(
        gameActorFromSession(session),
        context.sessionId,
        'HOST_LEFT'
      );
      await emitGameQuizSharedEvent({
        phase: updated.session.phase,
        sessionId: context.sessionId,
        stateVersion: updated.session.stateVersion,
      });
      return NextResponse.json(updated);
    } catch (error) {
      return gameQuizExceptionResponse(error, 'Failed to close live game.');
    }
  }
);
