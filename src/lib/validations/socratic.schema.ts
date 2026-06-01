import * as z from 'zod';

export const SOCRATIC_SUBJECTS = [
  'math',
  'physics',
  'chemistry',
  'biology',
  'history',
  'geography',
  'english',
  'other',
] as const;

export const socraticSubjectSchema = z.enum(SOCRATIC_SUBJECTS);

export type SocraticSubject = z.infer<typeof socraticSubjectSchema>;

export const DEFAULT_SOCRATIC_SUBJECT = 'other';
