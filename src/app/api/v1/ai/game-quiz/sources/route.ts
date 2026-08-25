import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api/error-response';
import { withAuth } from '@/lib/api/middlewares';
import {
  GameQuizAIService,
  GameQuizAIServiceError,
} from '@/services/GameQuizAIService';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/v1/ai/game-quiz/sources:
 *   get:
 *     tags:
 *       - AI Game Quiz
 *     summary: List courses and lessons eligible for AI Game Quiz generation
 *     security:
 *       - SessionCookie: []
 *     responses:
 *       200:
 *         description: Eligible courses with non-deleted modules and lessons
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [courses]
 *               properties:
 *                 courses:
 *                   type: array
 *                   items:
 *                     type: object
 *                     required: [id, title, modules]
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       title:
 *                         type: string
 *                       modules:
 *                         type: array
 *                         items:
 *                           type: object
 *                           required: [id, title, lessons]
 *                           properties:
 *                             id:
 *                               type: string
 *                               format: uuid
 *                             title:
 *                               type: string
 *                             lessons:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 required: [id, title]
 *                                 properties:
 *                                   id:
 *                                     type: string
 *                                     format: uuid
 *                                   title:
 *                                     type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to load eligible sources
 */
export const GET = withAuth(async (_request: Request, sessionData) => {
  try {
    const sources = await GameQuizAIService.listSources(sessionData.user.id);
    return NextResponse.json(sources, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('Game Quiz AI source discovery error:', error);
    if (error instanceof GameQuizAIServiceError) {
      return errorResponse(error.code, error.message, error.status);
    }
    return errorResponse(
      'INTERNAL_ERROR',
      'Failed to load AI Game Quiz sources',
      500
    );
  }
});
