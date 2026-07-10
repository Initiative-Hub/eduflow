import type { UIMessage } from 'ai';
import * as z from 'zod';

export const studyInteractiveContentSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(500),
  html: z.string().min(1).max(150_000),
});

export type StudyInteractiveContentData = z.infer<
  typeof studyInteractiveContentSchema
>;

export function getStudyInteractiveContentParts(
  message: UIMessage
): StudyInteractiveContentData[] {
  return message.parts.flatMap((part) => {
    if (part.type !== 'data-interactive-content') return [];

    const parsed = studyInteractiveContentSchema.safeParse(part.data);
    return parsed.success ? [parsed.data] : [];
  });
}
