import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@/generated/prisma';
import { withAuth, withRoles } from '@/lib/api/middlewares';
import { prisma } from '@/lib/prisma';

const saveQuestionsSchema = z.object({
  questions: z.array(z.record(z.string(), z.unknown())),
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
export const POST = withAuth(
  withRoles(['TEACHER', 'ADMIN'], async (req, sessionData, { params }) => {
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

      // Check if quiz exists
      const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        select: { id: true },
      });

      if (!quiz) {
        return NextResponse.json(
          { message: 'Quiz not found' },
          { status: 404 }
        );
      }

      // Update quiz questions and questionCount to match new array length
      const updatedQuiz = await prisma.quiz.update({
        where: { id: quizId },
        data: {
          questions: parsed.data.questions as unknown as Prisma.InputJsonValue,
          questionCount: parsed.data.questions.length,
        },
      });

      return NextResponse.json(updatedQuiz);
    } catch (error: any) {
      console.error('Error saving quiz questions:', error);
      return NextResponse.json(
        { message: 'Internal Server Error' },
        { status: 500 }
      );
    }
  })
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
export const PUT = withAuth(
  withRoles(['TEACHER', 'ADMIN'], async (req, sessionData, { params }) => {
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

      // Check if quiz exists
      const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        select: { id: true },
      });

      if (!quiz) {
        return NextResponse.json(
          { message: 'Quiz not found' },
          { status: 404 }
        );
      }

      // Update quiz questions and questionCount to match new array length
      const updatedQuiz = await prisma.quiz.update({
        where: { id: quizId },
        data: {
          questions: parsed.data.questions as unknown as Prisma.InputJsonValue,
          questionCount: parsed.data.questions.length,
        },
      });

      return NextResponse.json(updatedQuiz);
    } catch (error: any) {
      console.error('Error saving quiz questions:', error);
      return NextResponse.json(
        { message: 'Internal Server Error' },
        { status: 500 }
      );
    }
  })
);
