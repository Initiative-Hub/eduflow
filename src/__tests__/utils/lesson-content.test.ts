import { describe, expect, it } from 'vitest';
import {
  EMPTY_TIPTAP_DOCUMENT,
  isTiptapDocument,
  isTiptapDocumentEmpty,
} from '@/utils/lesson-content';

describe('lesson content helpers', () => {
  it('keeps valid Tiptap document JSON unchanged', () => {
    const document = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Existing lesson' }],
        },
      ],
    };

    expect(isTiptapDocument(document)).toBe(true);
  });

  it('detects documents without meaningful text content', () => {
    expect(isTiptapDocumentEmpty(EMPTY_TIPTAP_DOCUMENT)).toBe(true);
    expect(
      isTiptapDocumentEmpty({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }],
      })
    ).toBe(true);
    expect(
      isTiptapDocumentEmpty({
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'Lesson' }] },
        ],
      })
    ).toBe(false);
  });
});
