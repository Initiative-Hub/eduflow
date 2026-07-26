import type { JSONContent } from '@tiptap/core';

export type TiptapDocument = { type: 'doc'; content: JSONContent[] };

export const EMPTY_TIPTAP_DOCUMENT: TiptapDocument = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isTiptapDocument(content: unknown): content is TiptapDocument {
  return (
    isRecord(content) &&
    content.type === 'doc' &&
    Array.isArray(content.content)
  );
}

function hasTextContent(node: JSONContent): boolean {
  if (typeof node.text === 'string' && node.text.trim().length > 0) {
    return true;
  }

  return node.content?.some(hasTextContent) ?? false;
}

export function isTiptapDocumentEmpty(document: TiptapDocument): boolean {
  return !hasTextContent(document);
}
