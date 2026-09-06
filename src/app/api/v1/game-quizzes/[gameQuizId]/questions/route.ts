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
  saveGameQuizQuestionsSchema,
} from '@/lib/game-quiz/schemas';
import { saveGameQuizQuestions } from '@/services/GameQuizDefinitionService';

type RouteContext = { params: Promise<{ gameQuizId: string }> };

/**
 * @swagger
 * /api/v1/game-quizzes/{gameQuizId}/questions:
 *   put:
 *     tags: [Game Quizzes]
 *     summary: Atomically replace the editable question set and settings
 *     security: [{ SessionCookie: [] }]
 *     parameters: [{ in: path, name: gameQuizId, required: true, schema: { type: string, format: uuid } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [expectedRevision, settings, questions] }
 *     responses:
 *       200: { description: Game Quiz saved }
 *       400: { description: Invalid settings or questions }
 *       403: { description: Forbidden }
 *       404: { description: Game Quiz not found }
 *       409: { description: Revision conflict }
 */
export const PUT = withRoles(
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
      saveGameQuizQuestionsSchema
    );
    if (!parsedBody.success) {
      return validationErrorResponse(
        parsedBody.error,
        'Invalid Game Quiz questions.'
      );
    }

    try {
      return NextResponse.json(
        await saveGameQuizQuestions(
          gameActorFromSession(session),
          parsedParams.data.gameQuizId,
          parsedBody.data
        )
      );
    } catch (error) {
      return gameQuizExceptionResponse(error, 'Failed to save Game Quiz.');
    }
  }
);
