/**
 * Display types for quiz question components.
 *
 * These types represent what question components need to render.
 * Answer-related fields are optional because:
 * - During quiz-taking: client DTOs are used (no answer data)
 * - During result review: full question data is used (with answer data)
 *
 * Components should only access answer fields when `showResult` is true.
 */

// ─── Display Question Types ──────────────────────────────────────────────────

export interface DisplayMultipleChoiceOption {
  id: string;
  text: string;
  /** Only present in result review mode */
  isCorrect?: boolean;
}

export interface DisplayMultipleChoiceQuestion {
  type: 'multiple-choice';
  prompt: string;
  options: DisplayMultipleChoiceOption[];
  explanation?: string;
}

export interface DisplayTrueFalseQuestion {
  type: 'true-false';
  prompt: string;
  /** Only present in result review mode */
  correctAnswer?: boolean;
  explanation?: string;
}

export interface DisplayFillInTheBlankBlank {
  id: string;
  /** Only present in result review mode */
  acceptableAnswers?: string[];
}

export interface DisplayFillInTheBlankQuestion {
  type: 'fill-in-the-blank';
  promptTemplate: string;
  blanks: DisplayFillInTheBlankBlank[];
  explanation?: string;
}

export interface DisplayMatchingItem {
  id: string;
  text: string;
}

export interface DisplayMatchingPair {
  leftId: string;
  rightId: string;
}

export interface DisplayMatchingQuestion {
  type: 'matching';
  prompt: string;
  leftItems: DisplayMatchingItem[];
  rightItems: DisplayMatchingItem[];
  /** Only present in result review mode */
  correctPairs?: DisplayMatchingPair[];
  explanation?: string;
}

export interface DisplayOrderingItem {
  id: string;
  text: string;
}

export interface DisplayOrderingQuestion {
  type: 'ordering';
  prompt: string;
  items: DisplayOrderingItem[];
  /** Only present in result review mode */
  correctOrder?: string[];
  explanation?: string;
}

export interface DisplayDragAndDropZone {
  id: string;
  label: string;
}

export interface DisplayDragAndDropItem {
  id: string;
  text: string;
}

export interface DisplayDragAndDropQuestion {
  type: 'drag-and-drop';
  prompt: string;
  sentenceTemplate: string;
  zones: DisplayDragAndDropZone[];
  items: DisplayDragAndDropItem[];
  /** Only present in result review mode */
  correctMapping?: Record<string, string>;
  explanation?: string;
}

export interface DisplayEssayRubricCriterion {
  id: string;
  label: string;
  description: string;
  maxPoints: number;
}

export interface DisplayEssayQuestion {
  type: 'essay';
  prompt: string;
  rubric?: DisplayEssayRubricCriterion[];
  minWords?: number;
  maxWords?: number;
  allowAttachments?: boolean;
  deliveryOption?: 'immediate' | 'teacher-review';
  allowTeacherRubric?: boolean;
  explanation?: string;
}

export interface DisplayTimedChallengeQuestion {
  type: 'timed-challenge';
  prompt: string;
  innerQuestion: DisplayQuestionBlock;
  timeLimitSeconds: number;
  explanation?: string;
}

// ─── Display Union Type ──────────────────────────────────────────────────────

export type DisplayQuestionBlock =
  | DisplayMultipleChoiceQuestion
  | DisplayTrueFalseQuestion
  | DisplayFillInTheBlankQuestion
  | DisplayMatchingQuestion
  | DisplayOrderingQuestion
  | DisplayDragAndDropQuestion
  | DisplayEssayQuestion
  | DisplayTimedChallengeQuestion;
