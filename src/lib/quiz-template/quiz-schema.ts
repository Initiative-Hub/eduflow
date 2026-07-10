/**
 * Extended Quiz Schema types for the course quiz system.
 * Supports quiz categories, delivery modes, selection methods,
 * and the full question bank workflow.
 *
 * NOTE: These types use SCREAMING_SNAKE_CASE to match Prisma enum values directly.
 * The question `type` discriminator inside QuestionBlock JSON is separate and uses snake_case.
 */

import type { QuestionBlock } from './types';

// ─── Quiz Categories & Sub-Types ─────────────────────────────────────────────

export type QuizCategory = 'SELECTION_BASED' | 'OPEN_ENDED';

export type SelectionBasedSubType =
  | 'MULTIPLE_CHOICE'
  | 'TRUE_FALSE'
  | 'MATCHING'
  | 'ORDERING';

export type OpenEndedSubType = 'ESSAY' | 'FILL_IN_THE_BLANK' | 'DRAG_AND_DROP';

export type QuestionSubType = SelectionBasedSubType | OpenEndedSubType;

// ─── Delivery Modes ──────────────────────────────────────────────────────────

export type DeliveryMode = 'INSTANT_FEEDBACK' | 'POST_QUIZ_REVIEW';

// ─── Selection Methods ───────────────────────────────────────────────────────

export type SelectionMethod = 'HAND_PICK' | 'RANDOM' | 'MANUAL_CREATE';

// ─── Question Bank Entry ─────────────────────────────────────────────────────

export interface QuestionBankEntry {
  id: string;
  courseId: string;
  lessonId: string | null;
  category: QuizCategory;
  subType: QuestionSubType;
  prompt: string;
  answerData: QuestionBlock;
  explanation?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Quiz Definition ─────────────────────────────────────────────────────────

export interface QuizDefinition {
  id: string;
  courseId: string;
  lessonIds: string[];
  title: string;
  description?: string;
  questionCounts: Partial<Record<QuestionSubType, number>>;
  deliveryMode: DeliveryMode;
  selectionMethod: SelectionMethod;
  questionCount: number;
  questions: QuestionBlock[];
  questionIds?: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── Quiz Configuration (for creation flow) ──────────────────────────────────

export interface QuizConfiguration {
  title: string;
  description?: string;
  questionCounts: Partial<Record<QuestionSubType, number>>;
  deliveryMode: DeliveryMode;
  selectionMethod: SelectionMethod;
  questionCount: number;
  /** IDs of hand-picked questions (when selectionMethod is 'hand-pick') */
  selectedQuestionIds?: string[];
  /** Lesson filter for random selection */
  lessonFilter?: string | null;
}

// ─── Mock Data Structure ─────────────────────────────────────────────────────

export interface MockLesson {
  id: string;
  title: string;
  orderIndex: number;
  content: Record<string, unknown> | null;
}

export interface MockModule {
  id: string;
  title: string;
  orderIndex: number;
  lessons: MockLesson[];
}

export interface MockCourse {
  id: string;
  title: string;
  description: string;
  modules: MockModule[];
  questions: QuestionBankEntry[];
  quizzes: QuizDefinition[];
}

// ─── Category Metadata ───────────────────────────────────────────────────────

export const QUIZ_CATEGORIES: Record<
  QuizCategory,
  { label: string; description: string; subTypes: QuestionSubType[] }
> = {
  SELECTION_BASED: {
    label: 'Selection-Based',
    description:
      'Multiple Choice, True/False, Matching, Ordering (students pick/select)',
    subTypes: ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'MATCHING', 'ORDERING'],
  },
  OPEN_ENDED: {
    label: 'Open-Ended',
    description:
      'Fill-in-the-Blank, Drag-and-Drop Fill, Essay (students input/write)',
    subTypes: ['FILL_IN_THE_BLANK', 'DRAG_AND_DROP', 'ESSAY'],
  },
};

export const QUESTION_SUB_TYPE_LABELS: Record<QuestionSubType, string> = {
  MULTIPLE_CHOICE: 'Multiple Choice',
  TRUE_FALSE: 'True / False',
  MATCHING: 'Matching',
  ORDERING: 'Ordering',
  ESSAY: 'Essay',
  FILL_IN_THE_BLANK: 'Fill in the Blank',
  DRAG_AND_DROP: 'Drag & Drop Fill',
};

export const DELIVERY_MODE_LABELS: Record<DeliveryMode, string> = {
  INSTANT_FEEDBACK: 'Instant Feedback',
  POST_QUIZ_REVIEW: 'Post-Quiz Review',
};

export const SELECTION_METHOD_LABELS: Record<SelectionMethod, string> = {
  HAND_PICK: 'Hand-Pick',
  RANDOM: 'Random',
  MANUAL_CREATE: 'Manual Create',
};

// ─── SubType ↔ QuestionBlock type mapping ────────────────────────────────────

/**
 * Maps Prisma SCREAMING_SNAKE_CASE subType values to the snake_case
 * `type` discriminator used inside QuestionBlock JSON.
 */
export const SUB_TYPE_TO_QUESTION_TYPE: Record<QuestionSubType, string> = {
  MULTIPLE_CHOICE: 'multiple_choice',
  TRUE_FALSE: 'true_false',
  MATCHING: 'matching',
  ORDERING: 'ordering',
  ESSAY: 'essay',
  FILL_IN_THE_BLANK: 'fill_in_the_blank',
  DRAG_AND_DROP: 'drag_and_drop',
};

export const QUESTION_TYPE_TO_SUB_TYPE: Record<
  QuestionBlock['type'],
  QuestionSubType | null
> = {
  multiple_choice: 'MULTIPLE_CHOICE',
  true_false: 'TRUE_FALSE',
  matching: 'MATCHING',
  ordering: 'ORDERING',
  essay: 'ESSAY',
  fill_in_the_blank: 'FILL_IN_THE_BLANK',
  drag_and_drop: 'DRAG_AND_DROP',
  timed_challenge: null,
};

export const QUESTION_CATEGORY_BY_SUB_TYPE: Record<
  QuestionSubType,
  QuizCategory
> = {
  MULTIPLE_CHOICE: 'SELECTION_BASED',
  TRUE_FALSE: 'SELECTION_BASED',
  MATCHING: 'SELECTION_BASED',
  ORDERING: 'SELECTION_BASED',
  FILL_IN_THE_BLANK: 'OPEN_ENDED',
  DRAG_AND_DROP: 'OPEN_ENDED',
  ESSAY: 'OPEN_ENDED',
};

export function getQuestionTaxonomy(type: QuestionBlock['type']) {
  const subType = QUESTION_TYPE_TO_SUB_TYPE[type];
  if (!subType) {
    throw new Error(`Unsupported persisted question type: ${type}`);
  }
  return { subType, category: QUESTION_CATEGORY_BY_SUB_TYPE[subType] };
}
