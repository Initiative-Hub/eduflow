import { z } from 'zod';

export const STUDY_MODES = [
  'review',
  'practiceTest',
  'keywords',
  'research',
] as const;

export const studyModeSchema = z.enum(STUDY_MODES);

export type StudyMode = z.infer<typeof studyModeSchema>;
