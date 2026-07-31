import { NextResponse } from 'next/server';
import { withRoles } from '@/lib/api/middlewares';
import {
  gameActorFromSession,
  gameQuizExceptionResponse,
  parseGameQuizBody,
  validationErrorResponse,
} from '@/lib/game-quiz/http';
import {
  gameQuizIdParamsSchema,
  updateGameQuizSchema,
} from '@/lib/game-quiz/schemas';
import {
  deleteGameQuiz,
  getGameQuiz,
  updateGameQuiz,
} from '@/services/GameQuizDefinitionService';

type RouteContext = { params: Promise<{ gameQuizId: string }> };

/**
 * @swagger
 * /api/v1/game-quizzes/{gameQuizId}:
 *   get:
 *     tags: [Game Quizzes]
 *     summary: Get one editable Game Quiz definition
 *     security: [{ SessionCookie: [] }]
 *     parameters: [{ in: path, name: gameQuizId, required: true, schema: { type: string, format: uuid } }]
 *     responses:
 *       200: { description: Game Quiz definition }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Game Quiz not found }
 */
export const GET = withRoles(
  ['TEACHER', 'ADMIN'],
  async (_request, session, { params }: RouteContext) => {
    const parsedParams = gameQuizIdParamsSchema.safeParse(await params);
    if (!parsedParams.success) {
      return validationErrorResponse(
        parsedParams.error,
        'Invalid Game Quiz ID.'
      );
    }

    try {
      return NextResponse.json(
        await getGameQuiz(
          gameActorFromSession(session),
          parsedParams.data.gameQuizId
        )
      );
    } catch (error) {
      return gameQuizExceptionResponse(error, 'Failed to load Game Quiz.');
    }
  }
);

/**
 * @swagger
 * /api/v1/game-quizzes/{gameQuizId}:
 *   patch:
 *     tags: [Game Quizzes]
 *     summary: Update Game Quiz settings with optimistic revision control
 *     security: [{ SessionCookie: [] }]
 *     parameters: [{ in: path, name: gameQuizId, required: true, schema: { type: string, format: uuid } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [expectedRevision] }
 *     responses:
 *       200: { description: Game Quiz updated }
 *       400: { description: Invalid payload }
 *       403: { description: Forbidden }
 *       404: { description: Game Quiz not found }
 *       409: { description: Revision conflict }
 */
export const PATCH = withRoles(
  ['TEACHER', 'ADMIN'],
  async (request, session, { params }: RouteContext) => {
    const parsedParams = gameQuizIdParamsSchema.safeParse(await params);
    if (!parsedParams.success) {
      return validationErrorResponse(
        parsedParams.error,
        'Invalid Game Quiz ID.'
      );
    }
    const parsedBody = await parseGameQuizBody(request, updateGameQuizSchema);
    if (!parsedBody.success) {
      return validationErrorResponse(
        parsedBody.error,
        'Invalid Game Quiz update.'
      );
    }

    try {
      return NextResponse.json(
        await updateGameQuiz(
          gameActorFromSession(session),
          parsedParams.data.gameQuizId,
          parsedBody.data
        )
      );
    } catch (error) {
      return gameQuizExceptionResponse(error, 'Failed to update Game Quiz.');
    }
  }
);

/**
 * @swagger
 * /api/v1/game-quizzes/{gameQuizId}:
 *   delete:
 *     tags: [Game Quizzes]
 *     summary: Delete a Game Quiz that has no session history
 *     security: [{ SessionCookie: [] }]
 *     parameters: [{ in: path, name: gameQuizId, required: true, schema: { type: string, format: uuid } }]
 *     responses:
 *       204: { description: Game Quiz deleted }
 *       400: { description: Invalid ID }
 *       403: { description: Forbidden }
 *       404: { description: Game Quiz not found }
 *       409: { description: Session history prevents deletion }
 */
export const DELETE = withRoles(
  ['TEACHER', 'ADMIN'],
  async (_request, session, { params }: RouteContext) => {
    const parsedParams = gameQuizIdParamsSchema.safeParse(await params);
    if (!parsedParams.success) {
      return validationErrorResponse(
        parsedParams.error,
        'Invalid Game Quiz ID.'
      );
    }

    try {
      await deleteGameQuiz(
        gameActorFromSession(session),
        parsedParams.data.gameQuizId
      );
      return new NextResponse(null, { status: 204 });
    } catch (error) {
      return gameQuizExceptionResponse(error, 'Failed to delete Game Quiz.');
    }
  }
);
