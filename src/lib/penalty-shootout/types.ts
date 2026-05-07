import type { MultipleChoiceQuestion } from '@/lib/quiz-template';

// ─── Content ──────────────────────────────────────────────────────────────────

export type PenaltyQuestion = MultipleChoiceQuestion;

export interface PenaltyContent {
  title: string;
  description: string;
  questions: PenaltyQuestion[];
}

// ─── Game State ───────────────────────────────────────────────────────────────

export type PenaltyGameState = 'idle' | 'question' | 'animating' | 'completed';

/** 1–9 zones of the goal (left-to-right, bottom-to-top) */
export type GoalZone = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type ShotOutcome = 'goal' | 'saved';

// ─── Shot & Game Results ─────────────────────────────────────────────────────

export interface ShotResult {
  questionIndex: number;
  isGoal: boolean;
  selectedOptionId: string;
  zone: GoalZone;
}

export interface PenaltyGameResult {
  goals: number;
  shots: number;
  percentage: number;
  shotResults: ShotResult[];
}
