import { apiClient } from '@/lib/api';
import type { QuizConfiguration, QuizDefinition } from '@/lib/quiz-template';
import type { QuestionBlock } from '@/lib/quiz-template/types';

export const quizService = {
  createGeneratedQuiz: async (
    courseId: string,
    config: QuizConfiguration & { lessonIds: string[] },
    context?: string
  ) => {
    const createdQuiz = await apiClient.post<QuizDefinition>(
      `v1/courses/${courseId}/quizzes`,
      {
        lessonIds: config.lessonIds,
        title: config.title,
        description: config.description,
        category: config.category,
        subType: config.subType,
        deliveryMode: config.deliveryMode,
        selectionMethod: 'MANUAL_CREATE',
        questionCount: config.questionCount,
        questions: [],
      }
    );

    return apiClient.post<QuizDefinition>('v1/ai/quiz', {
      quizId: createdQuiz.id,
      ...(context ? { context } : {}),
    });
  },

  saveQuestions: async (quizId: string, questions: QuestionBlock[]) => {
    return apiClient.put<any>(`v1/quizzes/${quizId}/questions`, {
      questions,
    });
  },

  generateQuestions: async (quizId: string, context?: string) => {
    return apiClient.post<any>(`v1/ai/quiz`, {
      quizId,
      context,
    });
  },
};
