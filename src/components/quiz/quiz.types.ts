import type {
  QuestionBlock,
  QuizContent,
  ScoreResult,
  StudentAnswer,
} from '@/lib/quiz-template';

// ─── Quiz Component Props ────────────────────────────────────────────────────

export interface QuizProps {
  quiz: QuizContent;
  onComplete?: (result: ScoreResult) => void;
  className?: string;
}

export interface QuizQuestionProps {
  question: QuestionBlock;
  questionIndex: number;
  totalQuestions: number;
  selectedAnswer?: StudentAnswer;
  onAnswer: (answer: StudentAnswer) => void;
  showResult?: boolean;
  isCorrect?: boolean;
}

export interface QuizResultProps {
  result: ScoreResult;
  quiz: QuizContent;
  onRetry?: () => void;
  onClose?: () => void;
}

export type QuizState = 'idle' | 'in-progress' | 'completed';
