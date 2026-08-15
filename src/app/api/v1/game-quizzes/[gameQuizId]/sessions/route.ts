import { NextResponse } from 'next/server';
import { withRoles } from '@/lib/api/middlewares';
import {
  gameActorFromSession,
  gameQuizExceptionResponse,
  parseGameQuizBody,
  validationErrorResponse,
} from '@/lib/game-quiz/http';
import {
  createGameSessionSchema,
  gameQuizIdParamsSchema,
} from '@/lib/game-quiz/schemas';
import { emitGameQuizSharedEvent } from '@/lib/realtime/game-quiz';
import { createGameSession } from '@/services/GameQuizSessionService';

type RouteContext = { params: Promise<{ gameQuizId: string }> };

/**
 * @swagger
 * /api/v1/game-quizzes/{gameQuizId}/sessions:
 *   post:
 *     tags: [Game Sessions]
 *     summary: Snapshot a Game Quiz into a new live session
 *     security: [{ SessionCookie: [] }]
 *     parameters: [{ in: path, name: gameQuizId, required: true, schema: { type: string, format: uuid } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [expectedRevision] }
 *     responses:
 *       201: { description: Session created in lobby phase }
 *       400: { description: Invalid payload }
 *       403: { description: Forbidden }
 *       404: { description: Game Quiz not found }
 *       409: { description: Empty quiz or revision conflict }
 */
export const POST = withRoles(
  ['TEACHER', 'ADMIN'],
  async (request, session, { params }: RouteContext) => {
    const parsedParams = gameQuizIdParamsSchema.safeParse(await params);
    if (!parsedParams.success) {
      return validationErrorResponse(
        parsedParams.error,
        'Invalid Game Quiz ID.'
      );
    }
    const parsedBody = await parseGameQuizBody(
      request,
      createGameSessionSchema
    );
    if (!parsedBody.success) {
      return validationErrorResponse(parsedBody.error, 'Invalid session data.');
    }

    try {
      const created = await createGameSession(
        gameActorFromSession(session),
        parsedParams.data.gameQuizId,
        parsedBody.data
      );
      if (!created) {
        throw new Error('Created Game Session is not accessible to its host.');
      }
      await emitGameQuizSharedEvent({
        sessionId: created.sessionId,
        phase: created.session.phase,
        stateVersion: created.session.stateVersion,
      });
      return NextResponse.json(
        { sessionId: created.sessionId, session: created.session },
        { status: 201 }
      );
    } catch (error) {
      return gameQuizExceptionResponse(error, 'Failed to create Game Session.');
    }
  }
);
