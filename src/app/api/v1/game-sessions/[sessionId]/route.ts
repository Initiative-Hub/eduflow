import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import {
  gameActorFromSession,
  gameQuizExceptionResponse,
  validationErrorResponse,
} from '@/lib/game-quiz/http';
import { gameSessionIdParamsSchema } from '@/lib/game-quiz/schemas';
import { getGameSession } from '@/services/GameQuizSessionService';

type RouteContext = { params: Promise<{ sessionId: string }> };

/**
 * @swagger
 * /api/v1/game-sessions/{sessionId}:
 *   get:
 *     tags: [Game Sessions]
 *     summary: Get the authoritative host or participant session snapshot
 *     security: [{ SessionCookie: [] }]
 *     parameters: [{ in: path, name: sessionId, required: true, schema: { type: string, format: uuid } }]
 *     responses:
 *       200: { description: Role-safe session snapshot }
 *       400: { description: Invalid ID }
 *       401: { description: Unauthorized }
 *       403: { description: Host or participant access required }
 *       404: { description: Session not found }
 */
export const GET = withAuth(
  async (_request, session, { params }: RouteContext) => {
    const parsedParams = gameSessionIdParamsSchema.safeParse(await params);
    if (!parsedParams.success) {
      return validationErrorResponse(
        parsedParams.error,
        'Invalid Game Session ID.'
      );
    }

    try {
      return NextResponse.json(
        await getGameSession(
          gameActorFromSession(session),
          parsedParams.data.sessionId
        )
      );
    } catch (error) {
      return gameQuizExceptionResponse(error, 'Failed to load Game Session.');
    }
  }
);
