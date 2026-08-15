import { NextResponse } from 'next/server';
import { withRoles } from '@/lib/api/middlewares';
import {
  gameActorFromSession,
  gameQuizExceptionResponse,
  resolveRequestLiveGameContext,
  validationErrorResponse,
} from '@/lib/game-quiz/http';
import { gameQuizIdParamsSchema } from '@/lib/game-quiz/schemas';
import { getHostAnswerProgress } from '@/services/GameQuizAnswerService';

type RouteContext = { params: Promise<{ gameQuizId: string }> };

/**
 * @swagger
 * /api/v1/game-quizzes/{gameQuizId}/live-game/answer-progress:
 *   get:
 *     summary: Get answer progress for the context-selected host game
 *     security: [{ SessionCookie: [] }]
 *     responses: { 200: { description: Answer progress }, 400: { description: Invalid request }, 401: { description: Unauthorized }, 403: { description: Forbidden }, 404: { description: Context unavailable } }
 */
export const GET = withRoles(
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
      const progress = await getHostAnswerProgress(
        gameActorFromSession(session),
        context.sessionId
      );
      return NextResponse.json({ ...progress, sessionId: undefined });
    } catch (error) {
      return gameQuizExceptionResponse(
        error,
        'Failed to load answer progress.'
      );
    }
  }
);
