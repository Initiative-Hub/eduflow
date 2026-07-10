import { NextResponse } from 'next/server';
import { z } from 'zod';
import { errorResponse } from '@/lib/api/error-response';
import { withRoles } from '@/lib/api/middlewares';
import { QuizService } from '@/services/QuizService';

// ─── Validation Schema ────────────────────────────────────────────────────────

const aiOptionsSchema = z.object({
  context: z.string().max(500).optional(),
  topic: z.string().max(500).optional(),
  apiKey: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
});

const questionSubTypeSchema = z.enum([
  'MULTIPLE_CHOICE',
  'TRUE_FALSE',
  'MATCHING',
  'ORDERING',
  'ESSAY',
  'FILL_IN_THE_BLANK',
  'DRAG_AND_DROP',
]);

const generateQuizInputSchema = z.union([
  aiOptionsSchema.extend({
    quizId: z.string().uuid('Invalid quizId'),
  }),
  aiOptionsSchema.extend({
    courseId: z.string().uuid('Invalid courseId'),
    lessonIds: z.array(z.string().uuid()).min(1),
    questionCounts: z.partialRecord(
      questionSubTypeSchema,
      z.number().int().min(0).max(50)
    ),
  }),
]);

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
export const POST = withRoles(
  ['TEACHER', 'ADMIN'],
  async (req: Request, sessionData) => {
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

      const { topic, apiKey, model, context } = parsed.data;

      if ('courseId' in parsed.data) {
        const draft = await QuizService.generateDraft(
          parsed.data.courseId,
          sessionData.user.id,
          {
            lessonIds: parsed.data.lessonIds,
            questionCounts: parsed.data.questionCounts,
            topic,
            apiKey,
            model,
            context,
          }
        );

        return NextResponse.json(draft, { status: 201 });
      }

      const quiz = await QuizService.generateAndSave(
        parsed.data.quizId,
        sessionData.user.id,
        {
          topic,
          apiKey,
          model,
          context,
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
  }
);
