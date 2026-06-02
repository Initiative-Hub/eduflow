// ─── Question Types ──────────────────────────────────────────────────────────

export interface MultipleChoiceOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface MultipleChoiceQuestion {
  type: 'multiple_choice';
  prompt: string;
  options: MultipleChoiceOption[];
  explanation?: string;
}

export interface TrueFalseQuestion {
  type: 'true_false';
  prompt: string;
  correctAnswer: boolean;
  explanation?: string;
}

export interface FillInTheBlankBlank {
  id: string;
  acceptableAnswers: string[];
}

export interface FillInTheBlankQuestion {
  type: 'fill_in_the_blank';
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
  type: 'drag_and_drop';
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
  type: 'timed_challenge';
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

// ─── Answer Field Map ────────────────────────────────────────────────────────

/**
 * Maps each question type discriminator to its answer-bearing field names.
 * Used by utility types to derive client-safe and display-safe variants.
 */
export type AnswerFieldMap = {
  multiple_choice: 'isCorrect';
  true_false: 'correctAnswer';
  fill_in_the_blank: 'acceptableAnswers';
  matching: 'correctPairs';
  ordering: 'correctOrder';
  drag_and_drop: 'correctMapping';
  essay: never;
  timed_challenge: never;
};

// ─── Utility Types ───────────────────────────────────────────────────────────

/**
 * Identity type — ensures answer fields are required (base types already have them required).
 * Useful for explicitly marking that a type includes answer data for server-side use.
 */
export type WithAnswers<T extends QuestionBlock> = T;

/**
 * Strips answer fields from a question type for client-facing use.
 * Handles nested answer fields (e.g., isCorrect inside options, acceptableAnswers inside blanks).
 *
 * Note: TimedChallengeQuestion is handled separately in the ClientQuestionBlock union
 * to avoid circular type references.
 */
export type ClientSafe<T extends QuestionBlock> =
  T extends MultipleChoiceQuestion
    ? Omit<T, 'options' | 'explanation'> & {
        options: Omit<MultipleChoiceOption, 'isCorrect'>[];
      }
    : T extends FillInTheBlankQuestion
      ? Omit<T, 'blanks' | 'explanation'> & {
          blanks: Omit<FillInTheBlankBlank, 'acceptableAnswers'>[];
        }
      : T extends TrueFalseQuestion
        ? Omit<T, 'correctAnswer' | 'explanation'>
        : T extends MatchingQuestion
          ? Omit<T, 'correctPairs' | 'explanation'>
          : T extends OrderingQuestion
            ? Omit<T, 'correctOrder' | 'explanation'>
            : T extends DragAndDropQuestion
              ? Omit<T, 'correctMapping' | 'explanation'>
              : T extends EssayQuestion
                ? Omit<T, 'explanation'>
                : T extends TimedChallengeQuestion
                  ? Omit<T, 'innerQuestion' | 'explanation'> & {
                      innerQuestion: ClientQuestionBlock;
                    }
                  : T;

/**
 * Makes answer fields optional for review/display mode.
 * During quiz-taking, answer data is absent; during review, it's present.
 *
 * Note: TimedChallengeQuestion is handled separately in the DisplayQuestionBlock union
 * to avoid circular type references.
 */
export type DisplaySafe<T extends QuestionBlock> =
  T extends MultipleChoiceQuestion
    ? Omit<T, 'options'> & {
        options: (Omit<MultipleChoiceOption, 'isCorrect'> & {
          isCorrect?: boolean;
        })[];
      }
    : T extends FillInTheBlankQuestion
      ? Omit<T, 'blanks'> & {
          blanks: (Omit<FillInTheBlankBlank, 'acceptableAnswers'> & {
            acceptableAnswers?: string[];
          })[];
        }
      : T extends TrueFalseQuestion
        ? Omit<T, 'correctAnswer'> & { correctAnswer?: boolean }
        : T extends MatchingQuestion
          ? Omit<T, 'correctPairs'> & { correctPairs?: MatchingPair[] }
          : T extends OrderingQuestion
            ? Omit<T, 'correctOrder'> & { correctOrder?: string[] }
            : T extends DragAndDropQuestion
              ? Omit<T, 'correctMapping'> & {
                  correctMapping?: Record<string, string>;
                }
              : T extends EssayQuestion
                ? T
                : T extends TimedChallengeQuestion
                  ? Omit<T, 'innerQuestion'> & {
                      innerQuestion: DisplayQuestionBlock;
                    }
                  : T;

// ─── Client-safe Timed Challenge (breaks circular reference) ─────────────────

interface ClientTimedChallenge {
  type: 'timed_challenge';
  prompt: string;
  innerQuestion: ClientQuestionBlock;
  timeLimitSeconds: number;
}

interface DisplayTimedChallenge {
  type: 'timed_challenge';
  prompt: string;
  innerQuestion: DisplayQuestionBlock;
  timeLimitSeconds: number;
  explanation?: string;
}

// ─── Derived Union Types ─────────────────────────────────────────────────────

/**
 * Client-safe question block — all answer fields stripped.
 * Use this for student-facing quiz content where answers must not be visible.
 */
export type ClientQuestionBlock =
  | ClientSafe<MultipleChoiceQuestion>
  | ClientSafe<TrueFalseQuestion>
  | ClientSafe<FillInTheBlankQuestion>
  | ClientSafe<MatchingQuestion>
  | ClientSafe<OrderingQuestion>
  | ClientSafe<DragAndDropQuestion>
  | ClientSafe<EssayQuestion>
  | ClientTimedChallenge;

/**
 * Display-safe question block — answer fields are optional.
 * Use this for question components that render in both quiz-taking and review modes.
 */
export type DisplayQuestionBlock =
  | DisplaySafe<MultipleChoiceQuestion>
  | DisplaySafe<TrueFalseQuestion>
  | DisplaySafe<FillInTheBlankQuestion>
  | DisplaySafe<MatchingQuestion>
  | DisplaySafe<OrderingQuestion>
  | DisplaySafe<DragAndDropQuestion>
  | DisplaySafe<EssayQuestion>
  | DisplayTimedChallenge;

/**
 * Client-safe quiz content — questions have answer fields stripped.
 */
export interface ClientQuizContent {
  title: string;
  description: string;
  type: string;
  questions: ClientQuestionBlock[];
}

// ─── Quiz Content ────────────────────────────────────────────────────────────

export interface QuizContent {
  title: string;
  description: string;
  type: string;
  questions: QuestionBlock[];
}

// ─── Student Answers ─────────────────────────────────────────────────────────

export interface MultipleChoiceAnswer {
  type: 'multiple_choice';
  selectedOptionId: string;
}

export interface TrueFalseAnswer {
  type: 'true_false';
  selectedAnswer: boolean;
}

export interface FillInTheBlankAnswer {
  type: 'fill_in_the_blank';
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
  type: 'drag_and_drop';
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
