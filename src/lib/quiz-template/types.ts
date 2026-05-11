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

export interface DragAndDropZone {
  id: string;
  label: string;
}

export interface DragAndDropItem {
  id: string;
  text: string;
}

export interface DragAndDropQuestion {
  type: 'drag-and-drop';
  prompt: string;
  /** Template with {{zoneId}} placeholders where items should be dropped */
  sentenceTemplate: string;
  /** Drop zones defined in the template */
  zones: DragAndDropZone[];
  /** Draggable items (may include distractors) */
  items: DragAndDropItem[];
  /** Correct mapping: zoneId → itemId */
  correctMapping: Record<string, string>;
  explanation?: string;
}

export interface TimedChallengeQuestion {
  type: 'timed-challenge';
  prompt: string;
  innerQuestion: QuestionBlock;
  timeLimitSeconds: number;
  explanation?: string;
}

// ─── Essay / Text-Based Question ─────────────────────────────────────────────

export interface EssayRubricCriterion {
  id: string;
  label: string;
  description: string;
  maxPoints: number;
}

/**
 * Delivery option for AI feedback on essay answers.
 * - 'immediate': AI feedback is shown to the student right away.
 *   Students can "report to teacher" if the AI evaluation is inaccurate.
 * - 'teacher-review': AI feedback is reviewed by the teacher before
 *   being released to the student (students do not see scores immediately).
 */
export type EssayDeliveryOption = 'immediate' | 'teacher-review';

export interface EssayQuestion {
  type: 'essay';
  prompt: string;
  /** Optional rubric criteria shown to the student */
  rubric?: EssayRubricCriterion[];
  /** Minimum word count (optional) */
  minWords?: number;
  /** Maximum word count (optional) */
  maxWords?: number;
  /** Whether file attachments are allowed */
  allowAttachments?: boolean;
  /**
   * How AI feedback is delivered:
   * - 'immediate': AI evaluates and shows feedback instantly; student can report inaccuracies.
   * - 'teacher-review': AI feedback goes to teacher first; student sees score only after teacher releases it.
   * Defaults to 'immediate'.
   */
  deliveryOption?: EssayDeliveryOption;
  /** Whether the teacher can provide a custom rubric (text or file) */
  allowTeacherRubric?: boolean;
  explanation?: string;
}

// ─── Union Types ─────────────────────────────────────────────────────────────

export type QuestionBlock =
  | MultipleChoiceQuestion
  | TrueFalseQuestion
  | FillInTheBlankQuestion
  | MatchingQuestion
  | OrderingQuestion
  | DragAndDropQuestion
  | EssayQuestion
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

export interface DragAndDropAnswer {
  type: 'drag-and-drop';
  /** Mapping of zoneId → itemId placed by the student */
  placements: Record<string, string>;
}

export interface EssayAnswer {
  type: 'essay';
  text: string;
  /** File names attached by the student */
  attachments?: string[];
  /** Custom rubric text provided by the teacher */
  teacherRubricText?: string;
  /** File names attached by the teacher as rubric */
  teacherRubricAttachments?: string[];
}

export type StudentAnswer =
  | MultipleChoiceAnswer
  | TrueFalseAnswer
  | FillInTheBlankAnswer
  | MatchingAnswer
  | OrderingAnswer
  | DragAndDropAnswer
  | EssayAnswer;

export type StudentAnswers = Map<number, StudentAnswer>;

// ─── Scoring ─────────────────────────────────────────────────────────────────

export interface QuestionResult {
  questionIndex: number;
  isCorrect: boolean;
  earnedPoints: number;
  maxPoints: number;
  /** Whether this question requires manual/AI grading (e.g., essays) */
  pendingReview?: boolean;
}

export interface ScoreResult {
  totalPoints: number;
  earnedPoints: number;
  percentage: number;
  questionResults: QuestionResult[];
  /** Whether any questions are pending manual/AI review */
  hasPendingReview?: boolean;
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
