import { NextResponse } from 'next/server';
import { withRoles } from '@/lib/api/middlewares';
import {
  gameActorFromSession,
  gameQuizExceptionResponse,
  resolveRequestLiveGameContext,
  validationErrorResponse,
} from '@/lib/game-quiz/http';
import { gameQuizIdParamsSchema } from '@/lib/game-quiz/schemas';
import { getGameSessionReport } from '@/services/GameQuizAnswerService';

type RouteContext = { params: Promise<{ gameQuizId: string }> };

/**
 * @swagger
 * /api/v1/game-quizzes/{gameQuizId}/live-game/report:
 *   get:
 *     summary: Get the current host-context live game report
 *     security: [{ SessionCookie: [] }]
 *     responses: { 200: { description: Game report }, 400: { description: Invalid request }, 401: { description: Unauthorized }, 403: { description: Forbidden }, 404: { description: Context unavailable } }
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
      return NextResponse.json(
        await getGameSessionReport(
          gameActorFromSession(session),
          context.sessionId
        )
      );
    } catch (error) {
      return gameQuizExceptionResponse(
        error,
        'Failed to load live game report.'
      );
    }
  }
);
