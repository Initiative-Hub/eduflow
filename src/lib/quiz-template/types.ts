// ─── Question Types ──────────────────────────────────────────────────────────

export interface MultipleChoiceOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface MultipleChoiceQuestion {
  type: 'multiple-choice';
  prompt: string;
  options: MultipleChoiceOption[];
  explanation?: string;
}

export interface TrueFalseQuestion {
  type: 'true-false';
  prompt: string;
  correctAnswer: boolean;
  explanation?: string;
}

export interface FillInTheBlankBlank {
  id: string;
  acceptableAnswers: string[];
}

export interface FillInTheBlankQuestion {
  type: 'fill-in-the-blank';
  promptTemplate: string;
  blanks: FillInTheBlankBlank[];
  explanation?: string;
}

export interface MatchingItem {
  id: string;
  text: string;
}

export interface MatchingPair {
  leftId: string;
  rightId: string;
}

export interface MatchingQuestion {
  type: 'matching';
  prompt: string;
  leftItems: MatchingItem[];
  rightItems: MatchingItem[];
  correctPairs: MatchingPair[];
  explanation?: string;
}

export interface OrderingItem {
  id: string;
  text: string;
}

export interface OrderingQuestion {
  type: 'ordering';
  prompt: string;
  items: OrderingItem[];
  correctOrder: string[];
  explanation?: string;
}

export interface FlashcardQuestion {
  type: 'flashcard';
  front: string;
  back: string;
}

export interface DragAndDropQuestion {
  type: 'drag-and-drop';
  prompt: string;
  explanation?: string;
}

export interface TimedChallengeQuestion {
  type: 'timed-challenge';
  prompt: string;
  innerQuestion: QuestionBlock;
  timeLimitSeconds: number;
  explanation?: string;
}

// ─── Union Types ─────────────────────────────────────────────────────────────

export type QuestionBlock =
  | MultipleChoiceQuestion
  | TrueFalseQuestion
  | FillInTheBlankQuestion
  | MatchingQuestion
  | OrderingQuestion
  | FlashcardQuestion
  | DragAndDropQuestion
  | TimedChallengeQuestion;

// ─── Quiz Content ────────────────────────────────────────────────────────────

export interface QuizContent {
  title: string;
  description: string;
  type: string;
  questions: QuestionBlock[];
}

// ─── Student Answers ─────────────────────────────────────────────────────────

export interface MultipleChoiceAnswer {
  type: 'multiple-choice';
  selectedOptionId: string;
}

export interface TrueFalseAnswer {
  type: 'true-false';
  selectedAnswer: boolean;
}

export interface FillInTheBlankAnswer {
  type: 'fill-in-the-blank';
  filledBlanks: Record<string, string>;
}

export interface MatchingAnswer {
  type: 'matching';
  pairs: MatchingPair[];
}

export interface OrderingAnswer {
  type: 'ordering';
  orderedItemIds: string[];
}

export type StudentAnswer =
  | MultipleChoiceAnswer
  | TrueFalseAnswer
  | FillInTheBlankAnswer
  | MatchingAnswer
  | OrderingAnswer;

export type StudentAnswers = Map<number, StudentAnswer>;

// ─── Scoring ─────────────────────────────────────────────────────────────────

export interface QuestionResult {
  questionIndex: number;
  isCorrect: boolean;
  earnedPoints: number;
  maxPoints: number;
}

export interface ScoreResult {
  totalPoints: number;
  earnedPoints: number;
  percentage: number;
  questionResults: QuestionResult[];
}

export interface QuizSchema {
  type: string;
  constraints: {
    minQuestions: number;
    maxQuestions: number;
  };
  scoring: {
    pointsPerQuestion: number;
  };
  questions: QuestionBlock[];
}
