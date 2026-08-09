import { NextResponse } from 'next/server';
import { withRoles } from '@/lib/api/middlewares';
import {
  gameActorFromSession,
  gameQuizExceptionResponse,
  validationErrorResponse,
} from '@/lib/game-quiz/http';
import { gameSessionIdParamsSchema } from '@/lib/game-quiz/schemas';
import type { GameSessionReport } from '@/lib/game-quiz/types';
import { getGameSessionReport } from '@/services/GameQuizAnswerService';

type RouteContext = { params: Promise<{ sessionId: string }> };

/**
 * @swagger
 * /api/v1/game-sessions/{sessionId}/report:
 *   get:
 *     tags: [Game Sessions]
 *     summary: Get the host-only low-pressure Game Session report
 *     security: [{ SessionCookie: [] }]
 *     parameters: [{ in: path, name: sessionId, required: true, schema: { type: string, format: uuid } }]
 *     responses:
 *       200: { description: Round and participant game-point report }
 *       400: { description: Invalid ID }
 *       403: { description: Session host access required }
 *       404: { description: Session not found }
 */
export const GET = withRoles(
  ['TEACHER', 'ADMIN'],
  async (_request, session, { params }: RouteContext) => {
    const parsedParams = gameSessionIdParamsSchema.safeParse(await params);
    if (!parsedParams.success) {
      return validationErrorResponse(
        parsedParams.error,
        'Invalid Game Session ID.'
      );
    }

    try {
      const report: GameSessionReport = await getGameSessionReport(
        gameActorFromSession(session),
        parsedParams.data.sessionId
      );
      return NextResponse.json(report);
    } catch (error) {
      return gameQuizExceptionResponse(
        error,
        'Failed to load Game Session report.'
      );
    }
  }
);
