import type { UIMessage } from 'ai';
import * as z from 'zod';
import { sanitizeInteractiveContentDocument } from '@/lib/html-sanitizer';

export const studyInteractiveContentSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(500),
  html: z.string().min(1).max(150_000),
});

export type StudyInteractiveContentData = z.infer<
  typeof studyInteractiveContentSchema
>;

/**
 * Prepares AI-generated HTML for rendering inside EduFlow's sandboxed iframe.
 *
 * This is defense-in-depth. The iframe must still use a restrictive sandbox
 * such as `sandbox="allow-scripts"` without `allow-same-origin`.
 */
export function createSecureInteractiveContentDocument(html: string): string {
  return sanitizeInteractiveContentDocument(html);
}

export function createInteractiveContentDownloadFilename(
  title: string
): string {
  const normalizedTitle = title
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();

  return `${normalizedTitle || 'interactive-study-activity'}.html`;
}

export function createInteractiveContentInventoryFile({
  html,
  title,
}: {
  html: string;
  title: string;
}) {
  return new File([html], createInteractiveContentDownloadFilename(title), {
    type: 'text/html;charset=utf-8',
  });
}

export function getStudyInteractiveContentParts(
  message: UIMessage
): StudyInteractiveContentData[] {
  return message.parts.flatMap((part) => {
    if (part.type !== 'data-interactive-content') return [];

    const parsed = studyInteractiveContentSchema.safeParse(part.data);
    return parsed.success ? [parsed.data] : [];
  });
}
