import * as z from 'zod';

export const updateAiPreferencesSchema = z
  .object({
    customInstructions: z.string().trim().max(2000),
  })
  .strict();

export type UpdateAiPreferencesInput = z.infer<
  typeof updateAiPreferencesSchema
>;
