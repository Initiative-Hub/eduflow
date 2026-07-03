import type { DeliveryMode, QuestionSubType } from '@/generated/prisma';
import type {
  QuestionBlock,
  QuestionResult,
  StudentAnswer,
} from '@/lib/quiz-template/types';

export interface QuizAttemptSnapshot {
  title: string;
  description: string;
  type: QuestionSubType;
  deliveryMode: DeliveryMode;
  questions: QuestionBlock[];
}

interface SnapshotQuizMetadata {
  title: string;
  description: string | null;
  subType: QuestionSubType;
  deliveryMode: DeliveryMode;
}

export type QuestionAttemptStatus =
  | 'correct'
  | 'incorrect'
  | 'pending'
  | 'unanswered';

export function createQuizAttemptSnapshot(
  quiz: SnapshotQuizMetadata,
  questions: QuestionBlock[]
): QuizAttemptSnapshot {
  return {
    title: quiz.title,
    description: quiz.description ?? '',
    type: quiz.subType,
    deliveryMode: quiz.deliveryMode,
    questions,
  };
}

export function countAnsweredQuestions(
  answers: Record<string, unknown>,
  questionCount: number
): number {
  const answeredIndexes = new Set<number>();

  for (const key of Object.keys(answers)) {
    const index = Number(key);
    if (Number.isInteger(index) && index >= 0 && index < questionCount) {
      answeredIndexes.add(index);
    }
  }

  return answeredIndexes.size;
}

export function getQuestionAttemptStatus(
  answer: StudentAnswer | undefined,
  result: QuestionResult | undefined
): QuestionAttemptStatus {
  if (!answer) return 'unanswered';
  if (result?.pendingReview) return 'pending';
  return result?.isCorrect ? 'correct' : 'incorrect';
}
