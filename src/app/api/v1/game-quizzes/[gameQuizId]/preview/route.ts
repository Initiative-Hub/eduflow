import { NextResponse } from 'next/server';
import { withRoles } from '@/lib/api/middlewares';
import {
  gameActorFromSession,
  gameQuizExceptionResponse,
  validationErrorResponse,
} from '@/lib/game-quiz/http';
import { gameQuizIdParamsSchema } from '@/lib/game-quiz/schemas';
import { getGameQuiz } from '@/services/GameQuizDefinitionService';

type RouteContext = { params: Promise<{ gameQuizId: string }> };

/**
 * @swagger
 * /api/v1/game-quizzes/{gameQuizId}/preview:
 *   get:
 *     tags: [Game Quizzes]
 *     summary: Load immutable-safe authoring data for local host and player preview
 *     security: [{ SessionCookie: [] }]
 *     parameters: [{ in: path, name: gameQuizId, required: true, schema: { type: string, format: uuid } }]
 *     responses:
 *       200: { description: Preview definition }
 *       400: { description: Invalid ID }
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
      return NextResponse.json({
        mode: 'LOCAL_PREVIEW',
        definition: await getGameQuiz(
          gameActorFromSession(session),
          parsedParams.data.gameQuizId
        ),
      });
    } catch (error) {
      return gameQuizExceptionResponse(
        error,
        'Failed to load Game Quiz preview.'
      );
    }
  }
);
