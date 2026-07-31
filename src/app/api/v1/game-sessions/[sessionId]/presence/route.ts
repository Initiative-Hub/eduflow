import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import {
  gameActorFromSession,
  gameQuizExceptionResponse,
  validationErrorResponse,
} from '@/lib/game-quiz/http';
import { touchGameParticipantPresence } from '@/lib/game-quiz/presence';
import { gameSessionIdParamsSchema } from '@/lib/game-quiz/schemas';
import { getGameSession } from '@/services/GameQuizSessionService';

type RouteContext = { params: Promise<{ sessionId: string }> };

/**
 * @swagger
 * /api/v1/game-sessions/{sessionId}/presence:
 *   post:
 *     tags: [Game Sessions]
 *     summary: Refresh the caller's short-lived live-game presence signal
 *     security: [{ SessionCookie: [] }]
 *     parameters: [{ in: path, name: sessionId, required: true, schema: { type: string, format: uuid } }]
 *     responses:
 *       204: { description: Presence refreshed }
 *       400: { description: Invalid session ID }
 *       401: { description: Unauthorized }
 *       403: { description: Session participant access required }
 */
export const POST = withAuth(
  async (_request, session, { params }: RouteContext) => {
    const parsedParams = gameSessionIdParamsSchema.safeParse(await params);
    if (!parsedParams.success) {
      return validationErrorResponse(
        parsedParams.error,
        'Invalid Game Session ID.'
      );
    }

    try {
      const snapshot = await getGameSession(
        gameActorFromSession(session),
        parsedParams.data.sessionId
      );
      if (snapshot.audience !== 'PARTICIPANT') {
        return NextResponse.json(
          { error: 'Only session participants have game presence.' },
          { status: 403 }
        );
      }

      await touchGameParticipantPresence(
        parsedParams.data.sessionId,
        snapshot.session.participant.id
      );
      return new NextResponse(null, { status: 204 });
    } catch (error) {
      return gameQuizExceptionResponse(error, 'Failed to refresh presence.');
    }
  }
);
