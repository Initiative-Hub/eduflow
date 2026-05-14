import type {
  QuizContent,
  ScoreResult,
  StudentAnswers,
} from '@/lib/quiz-template';

// ─── Quiz Component Props ────────────────────────────────────────────────────

export interface QuizResultProps {
  result: ScoreResult;
  quiz: QuizContent;
  answers: StudentAnswers;
  onRetry?: () => void;
  onClose?: () => void;
}

export type QuizState = 'idle' | 'in-progress' | 'completed';
