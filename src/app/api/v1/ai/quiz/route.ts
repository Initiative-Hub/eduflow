import { NextResponse } from 'next/server';
import { z } from 'zod';
import { errorResponse } from '@/lib/api/error-response';
import { withAuth, withRoles } from '@/lib/api/middlewares';
import { QuizService } from '@/services/QuizService';

// ─── Validation Schema ────────────────────────────────────────────────────────

const generateQuizInputSchema = z.object({
  courseId: z.string().uuid('Invalid courseId'),
  lessonId: z.string().uuid('Invalid lessonId'),
  quizType: z.enum([
    'multiple-choice',
    'true-false',
    'fill-in-the-blank',
    'matching',
    'ordering',
    'drag-and-drop',
    'essay',
    'timed-challenge',
  ]),
  questionNumbers: z
    .string()
    .regex(/^\d+$/, 'Must be a numeric string')
    .default('5'),
  topic: z.string().max(500).optional(),
  content: z.string().max(20000).optional(),
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
 *     summary: Generate a quiz with AI and save it to the database
 *     security:
 *       - SessionCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [courseId, lessonId, quizType]
 *             properties:
 *               courseId:
 *                 type: string
 *                 format: uuid
 *               lessonId:
 *                 type: string
 *                 format: uuid
 *               quizType:
 *                 type: string
 *                 enum: [multiple-choice, true-false, fill-in-the-blank, matching, ordering, drag-and-drop, essay, timed-challenge]
 *               questionNumbers:
 *                 type: string
 *                 description: Number of questions to generate (numeric string, default "5")
 *               topic:
 *                 type: string
 *               content:
 *                 type: string
 *                 description: Optional source content for the AI to base the quiz on
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
 *       500:
 *         description: Internal server error
 */
export const POST = withAuth(
  withRoles(['TEACHER', 'ADMIN'], async (req: Request) => {
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

      const {
        courseId,
        lessonId,
        quizType,
        questionNumbers,
        topic,
        content,
        apiKey,
        model,
      } = parsed.data;

      const quiz = await QuizService.generateAndSave(courseId, lessonId, {
        quizType,
        questionNumbers,
        topic,
        content,
        apiKey,
        model,
      });

      return NextResponse.json(quiz, { status: 201 });
    } catch (error) {
      console.error('AI Quiz Generation Error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to generate quiz', 500);
    }
  })
);
