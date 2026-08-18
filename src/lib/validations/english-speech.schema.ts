import * as z from 'zod';

export const englishTTSRequestSchema = z.object({
  text: z.string().trim().min(1).max(3_000),
});

export const pronunciationAssessmentRequestSchema = z.object({
  audio: z.instanceof(File).refine((file) => file.size > 0, {
    message: 'Audio file must not be empty',
  }),
  targetText: z.string().trim().min(1).max(3_000),
  targetIpa: z.string().trim().max(200).optional(),
});
