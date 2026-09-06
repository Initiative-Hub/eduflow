import type { TiptapDocument } from '../../../src/utils/lesson-content';

export function assignmentDocument(...paragraphs: string[]): TiptapDocument {
  return {
    type: 'doc',
    content: paragraphs.map((text) => ({
      type: 'paragraph',
      content: [{ type: 'text', text }],
    })),
  };
}
