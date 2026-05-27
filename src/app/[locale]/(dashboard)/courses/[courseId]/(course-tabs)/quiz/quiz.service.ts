import { apiClient } from '@/lib/api';
import type { QuestionBlock } from '@/lib/quiz-template/types';

export const quizService = {
  saveQuestions: async (quizId: string, questions: QuestionBlock[]) => {
    return apiClient.put<any>(`v1/quizzes/${quizId}/questions`, {
      questions,
    });
  },
};
