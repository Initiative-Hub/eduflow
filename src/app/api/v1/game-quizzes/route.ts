import { NextResponse } from 'next/server';
import { withRoles } from '@/lib/api/middlewares';
import {
  gameActorFromSession,
  gameQuizExceptionResponse,
  parseGameQuizBody,
  validationErrorResponse,
} from '@/lib/game-quiz/http';
import { createGameQuizSchema } from '@/lib/game-quiz/schemas';
import {
  createGameQuiz,
  listGameQuizzes,
} from '@/services/GameQuizDefinitionService';

/**
 * @swagger
 * /api/v1/game-quizzes:
 *   get:
 *     tags: [Game Quizzes]
 *     summary: List reusable Game Quiz definitions owned by the current teacher
 *     security: [{ SessionCookie: [] }]
 *     responses:
 *       200: { description: Game Quiz library }
 *       401: { description: Unauthorized }
 *       403: { description: Teacher or admin role required }
 */
export const GET = withRoles(
  ['TEACHER', 'ADMIN'],
  async (_request, session) => {
    try {
      return NextResponse.json(
        await listGameQuizzes(gameActorFromSession(session))
      );
    } catch (error) {
      return gameQuizExceptionResponse(error, 'Failed to list Game Quizzes.');
    }
  }
);

/**
 * @swagger
 * /api/v1/game-quizzes:
 *   post:
 *     tags: [Game Quizzes]
 *     summary: Create a reusable Live Quiz Rally draft
 *     security: [{ SessionCookie: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [title] }
 *     responses:
 *       201: { description: Game Quiz draft created }
 *       400: { description: Invalid payload }
 *       401: { description: Unauthorized }
 *       403: { description: Teacher or admin role required }
 */
export const POST = withRoles(
  ['TEACHER', 'ADMIN'],
  async (request, session) => {
    const parsed = await parseGameQuizBody(request, createGameQuizSchema);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error, 'Invalid Game Quiz data.');
    }

    try {
      const quiz = await createGameQuiz(
        gameActorFromSession(session),
        parsed.data
      );
      return NextResponse.json(quiz, { status: 201 });
    } catch (error) {
      return gameQuizExceptionResponse(error, 'Failed to create Game Quiz.');
    }
  }
);
