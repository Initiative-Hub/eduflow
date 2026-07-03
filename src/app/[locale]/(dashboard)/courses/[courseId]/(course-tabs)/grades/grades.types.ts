import type { QuestionResult, StudentAnswer } from '@/lib/quiz-template/types';
import type { QuizAttemptSnapshot } from '@/services/quiz-attempt-snapshot';

export interface StudentGradeAttempt {
  id: string;
  quizId: string;
  quizSnapshot: QuizAttemptSnapshot;
  answers: Record<string, StudentAnswer>;
  score: number;
  maxScore: number;
  percentage: number;
  results: QuestionResult[];
  answeredCount: number;
  hasPendingReview: boolean;
  isLegacySnapshot: boolean;
  createdAt: string;
  updatedAt: string;
}
