/**
 * Shared type for the JSON content blob stored on a Lesson record.
 * The canonical shape produced by the editor is `{ text: string }`.
 */
export type LessonContent = Record<string, unknown> | null;

/**
 * Converts a stored lesson content blob to a plain string suitable for
 * display in a read-view or pre-population of a textarea editor.
 */
export function parseLessonContent(content: LessonContent): string {
  if (!content) return '';

  const text = content.text;
  if (typeof text === 'string') return text;

  // Fall back to pretty JSON for legacy / unknown content shapes
  if (Object.keys(content).length > 0) {
    return JSON.stringify(content, null, 2);
  }

  return '';
}
