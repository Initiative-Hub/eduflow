import type { z } from 'zod';

import type {
  answerOptionSchema,
  dragAndDropQuestionSchema,
  fillInTheBlankQuestionSchema,
  flashcardQuestionSchema,
  matchingQuestionSchema,
  multipleChoiceQuestionSchema,
  orderingQuestionSchema,
  questionBlockSchema,
  scoringConfigSchema,
  studentAnswerSchema,
  templateConstraintsSchema,
  templateMetadataSchema,
  templateSchemaValidator,
  timedChallengeQuestionSchema,
  trueFalseQuestionSchema,
} from './schema';

// ─── Template Types ──────────────────────────────────────────────────────────

export type QuizType =
  | 'multiple-choice'
  | 'true-false'
  | 'fill-in-the-blank'
  | 'matching'
  | 'ordering';

export type GameType = 'flashcard' | 'drag-and-drop' | 'timed-challenge';

export type TemplateType = QuizType | GameType;

// ─── Inferred Schema Types ───────────────────────────────────────────────────

export type TemplateSchema = z.infer<typeof templateSchemaValidator>;
export type TemplateMetadata = z.infer<typeof templateMetadataSchema>;
export type TemplateConstraints = z.infer<typeof templateConstraintsSchema>;
export type ScoringConfig = z.infer<typeof scoringConfigSchema>;
export type AnswerOption = z.infer<typeof answerOptionSchema>;
export type QuestionBlock = z.infer<typeof questionBlockSchema>;

// ─── Question Block Variants ─────────────────────────────────────────────────

export type MultipleChoiceQuestion = z.infer<
  typeof multipleChoiceQuestionSchema
>;
export type TrueFalseQuestion = z.infer<typeof trueFalseQuestionSchema>;
export type FillInTheBlankQuestion = z.infer<
  typeof fillInTheBlankQuestionSchema
>;
export type MatchingQuestion = z.infer<typeof matchingQuestionSchema>;
export type OrderingQuestion = z.infer<typeof orderingQuestionSchema>;
export type FlashcardQuestion = z.infer<typeof flashcardQuestionSchema>;
export type DragAndDropQuestion = z.infer<typeof dragAndDropQuestionSchema>;
export type TimedChallengeQuestion = z.infer<
  typeof timedChallengeQuestionSchema
>;

// ─── Student Answer Types ────────────────────────────────────────────────────

export type StudentAnswer = z.infer<typeof studentAnswerSchema>;

export type StudentAnswers = Map<number, StudentAnswer>;

// ─── Score Result Types ──────────────────────────────────────────────────────

export interface QuestionResult {
  questionIndex: number;
  isCorrect: boolean;
  studentAnswer: StudentAnswer | undefined;
  correctAnswer: unknown;
}

export interface ScoreResult {
  totalPoints: number;
  earnedPoints: number;
  percentage: number;
  questionResults: QuestionResult[];
}

// ─── Validation Types ────────────────────────────────────────────────────────

export interface ValidationError {
  path: string[];
  message: string;
  code: string;
}

export interface ValidationResult {
  success: boolean;
  errors: ValidationError[];
}
