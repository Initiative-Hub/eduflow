import { z } from 'zod';

export const WRITING_TOOLS = [
  'caption',
  'paraphrase',
  'email',
  'outline',
  'grammar',
  'rewrite',
] as const;

export const writingToolSchema = z.enum(WRITING_TOOLS);

export type WritingTool = z.infer<typeof writingToolSchema>;
