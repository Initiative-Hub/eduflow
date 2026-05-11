/**
 * Client-safe Data Transfer Objects (DTOs) for quiz questions.
 *
 * These types strip all answer/correctness data from questions before
 * sending them to the student's browser. This prevents students from
 * inspecting the payload to see correct answers.
 */

// ─── Client Question Types (No Answer Data) ─────────────────────────────────

export interface ClientMultipleChoiceOption {
  id: string;
  text: string;
  // `isCorrect` is intentionally omitted
}

export interface ClientMultipleChoiceQuestion {
  type: 'multiple-choice';
  prompt: string;
  options: ClientMultipleChoiceOption[];
}

export interface ClientTrueFalseQuestion {
  type: 'true-false';
  prompt: string;
  // `correctAnswer` is intentionally omitted
}

export interface ClientFillInTheBlankBlank {
  id: string;
  // `acceptableAnswers` is intentionally omitted
}

export interface ClientFillInTheBlankQuestion {
  type: 'fill-in-the-blank';
  promptTemplate: string;
  blanks: ClientFillInTheBlankBlank[];
}

export interface ClientMatchingItem {
  id: string;
  text: string;
}

export interface ClientMatchingQuestion {
  type: 'matching';
  prompt: string;
  leftItems: ClientMatchingItem[];
  rightItems: ClientMatchingItem[];
  // `correctPairs` is intentionally omitted
}

export interface ClientOrderingItem {
  id: string;
  text: string;
}

export interface ClientOrderingQuestion {
  type: 'ordering';
  prompt: string;
  items: ClientOrderingItem[];
  // `correctOrder` is intentionally omitted
}

export interface ClientDragAndDropZone {
  id: string;
  label: string;
}

export interface ClientDragAndDropItem {
  id: string;
  text: string;
}

export interface ClientDragAndDropQuestion {
  type: 'drag-and-drop';
  prompt: string;
  sentenceTemplate: string;
  zones: ClientDragAndDropZone[];
  items: ClientDragAndDropItem[];
  // `correctMapping` is intentionally omitted
}

export interface ClientEssayRubricCriterion {
  id: string;
  label: string;
  description: string;
  maxPoints: number;
}

export type ClientEssayDeliveryOption = 'immediate' | 'teacher-review';

export interface ClientEssayQuestion {
  type: 'essay';
  prompt: string;
  rubric?: ClientEssayRubricCriterion[];
  minWords?: number;
  maxWords?: number;
  allowAttachments?: boolean;
  deliveryOption?: ClientEssayDeliveryOption;
  allowTeacherRubric?: boolean;
}

export interface ClientTimedChallengeQuestion {
  type: 'timed-challenge';
  prompt: string;
  innerQuestion: ClientQuestionBlock;
  timeLimitSeconds: number;
}

// ─── Client Union Type ───────────────────────────────────────────────────────

export type ClientQuestionBlock =
  | ClientMultipleChoiceQuestion
  | ClientTrueFalseQuestion
  | ClientFillInTheBlankQuestion
  | ClientMatchingQuestion
  | ClientOrderingQuestion
  | ClientDragAndDropQuestion
  | ClientEssayQuestion
  | ClientTimedChallengeQuestion;

// ─── Client Quiz Content ─────────────────────────────────────────────────────

export interface ClientQuizContent {
  title: string;
  description: string;
  type: string;
  questions: ClientQuestionBlock[];
}
