import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api/error-response';
import { withAuth } from '@/lib/api/middlewares';
import { gameQuizAIGenerationInputSchema } from '@/lib/game-quiz/ai-schemas';
import {
  GameQuizAIService,
  GameQuizAIServiceError,
} from '@/services/GameQuizAIService';

export const dynamic = 'force-dynamic';
export const maxDuration = 90;

/**
 * @swagger
 * /api/v1/ai/game-quiz/questions:
 *   post:
 *     tags:
 *       - AI Game Quiz
 *     summary: Generate transient Game Quiz questions from selected lessons
 *     security:
 *       - SessionCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [courseId, lessonIds, questionCount, difficulty]
 *             properties:
 *               courseId:
 *                 type: string
 *                 format: uuid
 *               lessonIds:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 20
 *                 uniqueItems: true
 *                 items:
 *                   type: string
 *                   format: uuid
 *               questionCount:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 20
 *               additionalPrompt:
 *                 type: string
 *                 maxLength: 500
 *               topic:
 *                 type: string
 *                 maxLength: 120
 *               difficulty:
 *                 type: string
 *                 enum: [EASY, MEDIUM, HARD]
 *     responses:
 *       200:
 *         description: Generated questions; no Game Quiz records are persisted
 *       400:
 *         description: Invalid request or selected lesson content is empty
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Course or lessons are ineligible for the current user
 *       502:
 *         description: AI provider or structured output failure
 *       503:
 *         description: AI provider is not configured
 *       504:
 *         description: AI generation timed out
 */
export const POST = withAuth(async (request: Request, sessionData) => {
  let body: unknown;
  try {
    body = await request.json();
    console.log('AI Game Quiz generation request body:', body);
  } catch {
    return errorResponse('VALIDATION_ERROR', 'Invalid JSON request body', 400);
  }

  const parsed = gameQuizAIGenerationInputSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      'Invalid AI Game Quiz generation input',
      400,
      parsed.error.format()
    );
  }

  try {
    const result = await GameQuizAIService.generateQuestions(
      sessionData.user.id,
      parsed.data
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error('Game Quiz AI generation error:', error);
    if (error instanceof GameQuizAIServiceError) {
      return errorResponse(error.code, error.message, error.status);
    }
    return errorResponse(
      'AI_GENERATION_FAILED',
      'AI could not generate valid quiz questions',
      502
    );
  }
});
