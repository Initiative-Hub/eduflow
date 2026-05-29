import type {
  DeliveryMode,
  Prisma,
  QuestionSubType,
  QuizCategory,
  SelectionMethod,
} from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import type { AIQuizInput } from './ai/chat-provider.types';
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

  /**
   * Generates a quiz via AI (OpenRouter) and persists it to the database.
   *
   * @param courseId  - The course the quiz belongs to
   * @param lessonId  - The lesson the quiz is attached to
   * @param aiInput   - AI generation options (quizType, questionNumbers, topic, content, etc.)
   * @returns         The newly created Quiz record
   */
  static async generateAndSave(
    courseId: string,
    lessonId: string,
    aiInput: AIQuizInput
  ) {
    const service = new OpenRouterService();

    // 1. Generate the quiz structure from AI using the type-specific schema
    const generated = await service.createQuiz(aiInput);

    // 2. Persist to the database
    //    The AI schema returns the same enum string values that Prisma expects
    const quiz = await prisma.quiz.create({
      data: {
        courseId,
        lessonId,
        title: generated.title,
        description: generated.description,
        category: generated.category as QuizCategory,
        subType: generated.subType as QuestionSubType,
        deliveryMode: generated.deliveryMode as DeliveryMode,
        selectionMethod: generated.selectionMethod as SelectionMethod,
        questionCount: generated.questions.length,
        questions: generated.questions as unknown as Prisma.InputJsonValue,
      },
    });

    return quiz;
  }
}
