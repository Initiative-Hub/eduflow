import { NextResponse } from 'next/server';
import { withRoles } from '@/lib/api/middlewares';
import {
  gameActorFromSession,
  gameQuizExceptionResponse,
  validationErrorResponse,
} from '@/lib/game-quiz/http';
import {
  gameQuizIdParamsSchema,
  gameSessionIdParamsSchema,
} from '@/lib/game-quiz/schemas';
import { leaveGameSession } from '@/services/GameQuizSessionService';

type RouteContext = {
  params: Promise<{ gameQuizId: string; sessionId: string }>;
};

/**
 * @swagger
 * /api/v1/game-quizzes/{gameQuizId}/sessions/{sessionId}/leave:
 *   post:
 *     tags: [Game Sessions]
 *     summary: End an active live session because its host has left
 *     security: [{ SessionCookie: [] }]
 *     parameters:
 *       - { in: path, name: gameQuizId, required: true, schema: { type: string, format: uuid } }
 *       - { in: path, name: sessionId, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Session is ended or was already ended }
 *       400: { description: Invalid path parameters }
 *       403: { description: Forbidden }
 *       404: { description: Game session not found for this quiz }
 */
export const POST = withRoles(
  ['TEACHER', 'ADMIN'],
  async (_request, session, { params }: RouteContext) => {
    const parsedParams = gameQuizIdParamsSchema
      .merge(gameSessionIdParamsSchema)
      .safeParse(await params);
    if (!parsedParams.success) {
      return validationErrorResponse(
        parsedParams.error,
        'Invalid Game Quiz or Game Session ID.'
      );
    }

    try {
      return NextResponse.json(
        await leaveGameSession(
          gameActorFromSession(session),
          parsedParams.data.gameQuizId,
          parsedParams.data.sessionId
        )
      );
    } catch (error) {
      return gameQuizExceptionResponse(error, 'Failed to leave Game Session.');
    }
  }
);
