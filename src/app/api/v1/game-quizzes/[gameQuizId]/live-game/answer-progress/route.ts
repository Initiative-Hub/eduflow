import { NextResponse } from 'next/server';
import { withRoles } from '@/lib/api/middlewares';
import {
  gameActorFromSession,
  gameQuizExceptionResponse,
  resolveRequestLiveGameSession,
  validationErrorResponse,
} from '@/lib/game-quiz/http';
import { gameQuizIdParamsSchema } from '@/lib/game-quiz/schemas';
import { getHostAnswerProgress } from '@/services/GameQuizAnswerService';

type RouteContext = { params: Promise<{ gameQuizId: string }> };

/**
 * @swagger
 * /api/v1/game-quizzes/{gameQuizId}/live-game/answer-progress:
 *   get:
 *     summary: Get answer progress for the selected host game
 *     security: [{ SessionCookie: [] }]
 *     parameters:
 *       - in: header
 *         name: X-Live-Game-Session
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses: { 200: { description: Answer progress }, 400: { description: Invalid request or live session ID }, 401: { description: Unauthorized }, 403: { description: Forbidden }, 404: { description: Game Session not found } }
 */
export const GET = withRoles(
  ['TEACHER', 'ADMIN'],
  async (request, session, { params }: RouteContext) => {
    const parsed = gameQuizIdParamsSchema.safeParse(await params);
    if (!parsed.success)
      return validationErrorResponse(parsed.error, 'Invalid Game Quiz ID.');
    try {
      const liveSession = await resolveRequestLiveGameSession({
        audience: 'HOST',
        expectedGameQuizId: parsed.data.gameQuizId,
        request,
        session,
      });
      const progress = await getHostAnswerProgress(
        gameActorFromSession(session),
        liveSession.sessionId
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
