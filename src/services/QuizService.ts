import type { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { OpenRouterService } from './ai/OpenRouterService';
export class QuizService {
  static async updateQuestions(
    quizId: string,
    questions: Record<string, unknown>[]
  ) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: { id: true },
    });

    if (!quiz) {
      throw new Error('Quiz not found');
    }

    return await prisma.quiz.update({
      where: { id: quizId },
      data: {
        questions: questions as unknown as Prisma.InputJsonValue,
        questionCount: questions.length,
      },
    });
  }
}
