import { z } from 'zod';

export const STUDY_MODES = [
  'interactiveContent',
  'practiceTest',
  'research',
] as const;
export const studyModeSchema = z.enum(STUDY_MODES);
export type StudyMode = z.infer<typeof studyModeSchema>;

export const STUDY_QUIZ_QUESTION_TYPES = [
  'multiple_choice',
  'true_false',
  'fill_in_the_blank',
] as const;
export const studyQuizQuestionTypeSchema = z.enum(STUDY_QUIZ_QUESTION_TYPES);

export const DEFAULT_STUDY_QUIZ_OPTIONS: StudyQuizOptions = {
  questionCount: 10,
  questionTypes: [...STUDY_QUIZ_QUESTION_TYPES],
};

export const studyQuizOptionsSchema = z.object({
  questionCount: z.coerce.number().int().min(1).max(30).default(10),
  questionTypes: z
    .array(studyQuizQuestionTypeSchema)
    .min(1)
    .default([...STUDY_QUIZ_QUESTION_TYPES]),
});

export type StudyQuizQuestionType = z.infer<typeof studyQuizQuestionTypeSchema>;
export type StudyQuizOptions = z.infer<typeof studyQuizOptionsSchema>;
