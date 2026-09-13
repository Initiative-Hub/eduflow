import type {
  AttemptCheck,
  AttemptComplete,
  AttemptProgress,
} from '@/lib/validations/quiz-attempt.schema';
import type { QuizAttemptService } from '@/services/QuizAttemptService';
import { apiClient } from './api-client';

export type AttemptView = Awaited<ReturnType<typeof QuizAttemptService.get>>;
export type ActiveAttempt = Awaited<
  ReturnType<typeof QuizAttemptService.active>
>[number];
export const quizAttemptClient = {
  active: () => apiClient.get<ActiveAttempt[]>('v1/quiz-attempts/active'),
  start: (quizId: string) =>
    apiClient.post<AttemptView>(`v1/quizzes/${quizId}/attempts`),
  get: (attemptId: string) =>
    apiClient.get<AttemptView>(`v1/quiz-attempts/${attemptId}`),
  save: (id: string, input: AttemptProgress) =>
    apiClient.patch<AttemptView>(`v1/quiz-attempts/${id}`, input),
  check: (id: string, input: AttemptCheck) =>
    apiClient.post<AttemptView>(`v1/quiz-attempts/${id}/check`, input),
  complete: (id: string, input: AttemptComplete) =>
    apiClient.post<AttemptView>(`v1/quiz-attempts/${id}/complete`, input),
};

export function attemptErrorMessage(error: unknown, fallback: string) {
  return error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
    ? error.message
    : fallback;
}
export function isAttemptConflict(error: unknown) {
  return (
    !!error &&
    typeof error === 'object' &&
    'status' in error &&
    error.status === 409
  );
}
