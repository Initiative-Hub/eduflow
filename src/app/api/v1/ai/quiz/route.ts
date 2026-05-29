import { NextResponse } from 'next/server';
import { z } from 'zod';
import { errorResponse } from '@/lib/api/error-response';
import { withAuth, withRoles } from '@/lib/api/middlewares';
import { QuizService } from '@/services/QuizService';

// ─── Validation Schema ────────────────────────────────────────────────────────

const generateQuizInputSchema = z.object({
  quizId: z.string().uuid('Invalid courseId'),
  topic: z.string().max(500).optional(),
  apiKey: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
});

// ─── POST /api/v1/ai/quiz ─────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/ai/quiz:
 *   post:
 *     tags:
 *       - AI Quiz
 *     summary: Generate a quiz with AI from lesson content and save it to the database
 *     security:
 *       - SessionCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quizId]
 *             properties:
 *               quizId:
 *                 type: string
 *                 format: uuid
 *               topic:
 *                 type: string
 *                 description: Optional topic override — defaults to the lesson title
 *               apiKey:
 *                 type: string
 *               model:
 *                 type: string
 *     responses:
 *       201:
 *         description: Quiz generated and saved successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Lesson not found
 *       500:
 *         description: Internal server error
 */
export const POST = withAuth(
  withRoles(['TEACHER'], async (req: Request, sessionData) => {
    try {
      const body = await req.json();

      const parsed = generateQuizInputSchema.safeParse(body);
      if (!parsed.success) {
        return errorResponse(
          'VALIDATION_ERROR',
          'Invalid quiz generation input',
          400,
          parsed.error.format()
        );
      }

      const { quizId, topic, apiKey, model } = parsed.data;

      const quiz = await QuizService.generateAndSave(
        quizId,
        sessionData.user.id,
        {
          topic,
          apiKey,
          model,
        }
      );

      return NextResponse.json(quiz, { status: 201 });
    } catch (error) {
      console.error('AI Quiz Generation Error:', error);
      if (
        error instanceof Error &&
        error.message === 'Quiz already has the maximum number of questions'
      ) {
        return errorResponse('VALIDATION_ERROR', error.message, 400);
      }
      // Surface lesson-not-foundas a 404
      if (
        error instanceof Error &&
        (error.message.startsWith('Lesson not found') ||
          error.message === 'Forbidden')
      ) {
        return error.message === 'Forbidden'
          ? errorResponse('FORBIDDEN', error.message, 403)
          : errorResponse('NOT_FOUND', error.message, 404);
      }
      return errorResponse('INTERNAL_ERROR', 'Failed to generate quiz', 500);
    }
  })
);
