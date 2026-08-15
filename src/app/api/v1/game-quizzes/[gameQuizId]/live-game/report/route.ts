import { NextResponse } from 'next/server';
import { withRoles } from '@/lib/api/middlewares';
import {
  gameActorFromSession,
  gameQuizExceptionResponse,
  validationErrorResponse,
} from '@/lib/game-quiz/http';
import { resolveLiveGameReportRun } from '@/lib/game-quiz/live-game-context';
import {
  gameQuizIdParamsSchema,
  gameSessionContextKeySchema,
} from '@/lib/game-quiz/schemas';
import { getGameSessionReport } from '@/services/GameQuizAnswerService';

type RouteContext = { params: Promise<{ gameQuizId: string }> };

/**
 * @swagger
 * /api/v1/game-quizzes/{gameQuizId}/live-game/report:
 *   get:
 *     summary: Get a host-authorized live game report selected by an opaque run key
 *     security: [{ SessionCookie: [] }]
 *     parameters:
 *       - in: path
 *         name: gameQuizId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: run
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses: { 200: { description: Game report }, 400: { description: Invalid request }, 401: { description: Unauthorized }, 403: { description: Forbidden }, 404: { description: Context unavailable } }
 */
export const GET = withRoles(
  ['TEACHER', 'ADMIN'],
  async (request, session, { params }: RouteContext) => {
    const parsed = gameQuizIdParamsSchema.safeParse(await params);
    if (!parsed.success)
      return validationErrorResponse(parsed.error, 'Invalid Game Quiz ID.');
    const run = gameSessionContextKeySchema.safeParse(
      new URL(request.url).searchParams.get('run')
    );
    if (!run.success)
      return validationErrorResponse(run.error, 'Invalid report run key.');
    try {
      const reportRun = await resolveLiveGameReportRun({
        actor: gameActorFromSession(session),
        expectedGameQuizId: parsed.data.gameQuizId,
        runKey: run.data,
      });
      return NextResponse.json(
        await getGameSessionReport(
          gameActorFromSession(session),
          reportRun.sessionId
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
