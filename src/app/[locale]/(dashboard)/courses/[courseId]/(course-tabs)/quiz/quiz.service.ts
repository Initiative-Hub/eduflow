import { apiClient } from '@/lib/api';
import type {
  DeliveryMode,
  QuizConfiguration,
  QuizDefinition,
} from '@/lib/quiz-template';
import type { QuestionBlock } from '@/lib/quiz-template/types';

export const quizService = {
  generateDraft: async (
    courseId: string,
    params: {
      lessonIds: string[];
      questionCounts: QuizConfiguration['questionCounts'];
      context?: string;
    }
  ) => {
    return apiClient.post<{ questions: QuestionBlock[] }>('v1/ai/quiz', {
      courseId,
      ...params,
    });
  },

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
        questionCounts: config.questionCounts,
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

  saveQuestions: async (
    quizId: string,
    questions: QuestionBlock[],
    questionIds: Array<string | null>
  ) => {
    return apiClient.put<any>(`v1/quizzes/${quizId}/questions`, {
      questions,
      questionIds,
    });
  },

  updateDetails: async (
    quizId: string,
    details: {
      title: string;
      description?: string;
      lessonIds: string[];
      deliveryMode: DeliveryMode;
    }
  ) => {
    return apiClient.patch<QuizDefinition>(`v1/quizzes/${quizId}`, details);
  },

  deleteQuiz: async (quizId: string) => {
    return apiClient.delete(`v1/quizzes/${quizId}`);
  },

  generateQuestions: async (quizId: string, context?: string) => {
    return apiClient.post<any>(`v1/ai/quiz`, {
      quizId,
      context,
    });
  },
};
