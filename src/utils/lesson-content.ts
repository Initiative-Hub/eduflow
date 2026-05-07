import type { JSONContent } from '@tiptap/core';

export type TiptapDocument = JSONContent & { type: 'doc' };

/** Shared type for the JSON content blob stored on a Lesson record. */
export type LessonContent = Record<string, unknown> | string | null;

export const EMPTY_TIPTAP_DOCUMENT: TiptapDocument = {
  type: 'doc',
  content: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isTiptapDocument(content: unknown): content is TiptapDocument {
  return isRecord(content) && content.type === 'doc';
}

export function isHtmlContent(
  content: unknown
): content is { type: 'html'; content: string } {
  return (
    isRecord(content) &&
    content.type === 'html' &&
    typeof content.content === 'string'
  );
}

export function lessonContentToTiptapDocument(
  content: LessonContent
): TiptapDocument | string {
  if (isTiptapDocument(content)) return content;
  if (isHtmlContent(content)) return content.content;
  if (typeof content === 'string') return content;

  const text = isRecord(content) ? content?.text : undefined;
  if (typeof text === 'string' && text.trim().length > 0) {
    return {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text }],
        },
      ],
    };
  }

  return EMPTY_TIPTAP_DOCUMENT;
}

function hasTextContent(node: JSONContent): boolean {
  if (typeof node.text === 'string' && node.text.trim().length > 0) {
    return true;
  }

  return node.content?.some(hasTextContent) ?? false;
}

export function isTiptapDocumentEmpty(
  document: TiptapDocument | string
): boolean {
  if (typeof document === 'string') {
    return document.trim().replace(/<[^>]*>?/gm, '') === '';
  }
  return !hasTextContent(document);
}
