import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withRoles } from '@/lib/api/middlewares';
import { questionBlockSchema } from '@/lib/validations/quiz.schema';
import { QuizService } from '@/services/QuizService';

const saveQuestionsSchema = z
  .object({
    questions: z.array(questionBlockSchema),
    questionIds: z.array(z.string().uuid().nullable()),
  })
  .refine((data) => data.questions.length === data.questionIds.length, {
    message: 'questions and questionIds must have the same length',
  });

/**
 * @swagger
 * /api/v1/quizzes/{quizId}/questions:
 *   post:
 *     tags:
 *       - Quizzes
 *     summary: Update quiz questions
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [questions]
 *             properties:
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Quiz questions updated successfully
 *       400:
 *         description: Invalid questions data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Quiz not found
 *       500:
 *         description: Internal server error
 */
export const POST = withRoles(
  ['TEACHER', 'ADMIN'],
  async (req, _sessionData, { params }) => {
    try {
      const { quizId } = await params;
      const body = await req.json();

      const parsed = saveQuestionsSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { message: 'Invalid questions data', errors: parsed.error.format() },
          { status: 400 }
        );
      }

      const updatedQuiz = await QuizService.updateQuestions(
        quizId,
        _sessionData.user.id,
        parsed.data.questions,
        parsed.data.questionIds
      );

      return NextResponse.json(updatedQuiz);
    } catch (error: any) {
      if (error.message === 'Quiz not found') {
        return NextResponse.json(
          { message: 'Quiz not found' },
          { status: 404 }
        );
      }
      if (error.message === 'Forbidden') {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }
      console.error('Error saving quiz questions:', error);
      return NextResponse.json(
        { message: 'Internal Server Error' },
        { status: 500 }
      );
    }
  }
);

/**
 * @swagger
 * /api/v1/quizzes/{quizId}/questions:
 *   put:
 *     tags:
 *       - Quizzes
 *     summary: Update quiz questions (edit)
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [questions]
 *             properties:
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Quiz questions updated successfully
 *       400:
 *         description: Invalid questions data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Quiz not found
 *       500:
 *         description: Internal server error
 */
export const PUT = withRoles(
  ['TEACHER', 'ADMIN'],
  async (req, _sessionData, { params }) => {
    try {
      const { quizId } = await params;
      const body = await req.json();

      const parsed = saveQuestionsSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { message: 'Invalid questions data', errors: parsed.error.format() },
          { status: 400 }
        );
      }

      const updatedQuiz = await QuizService.updateQuestions(
        quizId,
        _sessionData.user.id,
        parsed.data.questions,
        parsed.data.questionIds
      );

      return NextResponse.json(updatedQuiz);
    } catch (error: any) {
      if (error.message === 'Quiz not found') {
        return NextResponse.json(
          { message: 'Quiz not found' },
          { status: 404 }
        );
      }
      if (error.message === 'Forbidden') {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }
      console.error('Error saving quiz questions:', error);
      return NextResponse.json(
        { message: 'Internal Server Error' },
        { status: 500 }
      );
    }
  }
);
