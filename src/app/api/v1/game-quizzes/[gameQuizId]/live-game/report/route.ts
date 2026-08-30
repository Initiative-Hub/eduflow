import { NextResponse } from 'next/server';
import { withRoles } from '@/lib/api/middlewares';
import {
  gameActorFromSession,
  gameQuizExceptionResponse,
  resolveLiveGameSession,
  validationErrorResponse,
} from '@/lib/game-quiz/http';
import {
  gameQuizIdParamsSchema,
  gameSessionIdSchema,
} from '@/lib/game-quiz/schemas';
import { getGameSessionReport } from '@/services/GameQuizAnswerService';

type RouteContext = { params: Promise<{ gameQuizId: string }> };

/**
 * @swagger
 * /api/v1/game-quizzes/{gameQuizId}/live-game/report:
 *   get:
 *     summary: Get a host-authorized live game report by session ID
 *     security: [{ SessionCookie: [] }]
 *     parameters:
 *       - in: path
 *         name: gameQuizId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: sessionId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses: { 200: { description: Game report }, 400: { description: Invalid request }, 401: { description: Unauthorized }, 403: { description: Forbidden }, 404: { description: Game Session not found } }
 */
export const GET = withRoles(
  ['TEACHER', 'ADMIN'],
  async (request, session, { params }: RouteContext) => {
    const parsed = gameQuizIdParamsSchema.safeParse(await params);
    if (!parsed.success)
      return validationErrorResponse(parsed.error, 'Invalid Game Quiz ID.');
    const sessionId = gameSessionIdSchema.safeParse(
      new URL(request.url).searchParams.get('sessionId')
    );
    if (!sessionId.success)
      return validationErrorResponse(
        sessionId.error,
        'Invalid Game Session ID.'
      );
    try {
      const liveSession = await resolveLiveGameSession({
        actor: gameActorFromSession(session),
        audience: 'HOST',
        expectedGameQuizId: parsed.data.gameQuizId,
        sessionId: sessionId.data,
      });
      const report = await getGameSessionReport(
        gameActorFromSession(session),
        liveSession.sessionId
      );
      return report
        ? NextResponse.json(report)
        : NextResponse.json({ status: 'PROCESSING' }, { status: 202 });
    } catch (error) {
      return gameQuizExceptionResponse(
        error,
        'Failed to load live game report.'
      );
    }
  }
);
