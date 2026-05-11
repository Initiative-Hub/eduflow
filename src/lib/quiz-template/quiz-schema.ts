/**
 * Extended Quiz Schema types for the course quiz system.
 * Supports quiz categories, delivery modes, selection methods,
 * and the full question bank workflow.
 */

import type { QuestionBlock } from './types';

// ─── Quiz Categories & Sub-Types ─────────────────────────────────────────────

export type QuizCategory = 'selection-based' | 'open-ended';

export type SelectionBasedSubType =
  | 'multiple-choice'
  | 'true-false'
  | 'matching'
  | 'ordering';

export type OpenEndedSubType = 'essay' | 'fill-in-the-blank' | 'drag-and-drop';

export type QuestionSubType = SelectionBasedSubType | OpenEndedSubType;

// ─── Delivery Modes ──────────────────────────────────────────────────────────

export type DeliveryMode = 'instant-feedback' | 'post-quiz-review';

// ─── Selection Methods ───────────────────────────────────────────────────────

export type SelectionMethod = 'hand-pick' | 'random' | 'manual-create';

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
  lessonId: string;
  title: string;
  description?: string;
  category: QuizCategory;
  subType: QuestionSubType;
  deliveryMode: DeliveryMode;
  selectionMethod: SelectionMethod;
  questionCount: number;
  questions: QuestionBlock[];
  createdAt: string;
  updatedAt: string;
}

// ─── Quiz Configuration (for creation flow) ──────────────────────────────────

export interface QuizConfiguration {
  title: string;
  description?: string;
  category: QuizCategory;
  subType: QuestionSubType;
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
  'selection-based': {
    label: 'Selection-Based',
    description:
      'Multiple Choice, True/False, Matching, Ordering (students pick/select)',
    subTypes: ['multiple-choice', 'true-false', 'matching', 'ordering'],
  },
  'open-ended': {
    label: 'Open-Ended',
    description:
      'Essay, Fill-in-the-Blank, Drag-and-Drop Fill (students input/write)',
    subTypes: ['essay', 'fill-in-the-blank', 'drag-and-drop'],
  },
};

export const QUESTION_SUB_TYPE_LABELS: Record<QuestionSubType, string> = {
  'multiple-choice': 'Multiple Choice',
  'true-false': 'True / False',
  matching: 'Matching',
  ordering: 'Ordering',
  essay: 'Essay',
  'fill-in-the-blank': 'Fill in the Blank',
  'drag-and-drop': 'Drag & Drop Fill',
};

export const DELIVERY_MODE_LABELS: Record<DeliveryMode, string> = {
  'instant-feedback': 'Instant Feedback',
  'post-quiz-review': 'Post-Quiz Review',
};

export const SELECTION_METHOD_LABELS: Record<SelectionMethod, string> = {
  'hand-pick': 'Hand-Pick',
  random: 'Random',
  'manual-create': 'Manual Create',
};
