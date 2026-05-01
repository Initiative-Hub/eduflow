import { describe, expect, it } from 'vitest';
import {
  EMPTY_TIPTAP_DOCUMENT,
  isTiptapDocument,
  isTiptapDocumentEmpty,
  lessonContentToTiptapDocument,
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
    expect(lessonContentToTiptapDocument(document)).toBe(document);
  });

  it('converts legacy text content to a Tiptap paragraph', () => {
    expect(lessonContentToTiptapDocument({ text: 'Legacy lesson' })).toEqual({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Legacy lesson' }],
        },
      ],
    });
  });

  it('uses an empty Tiptap document for empty or unknown content', () => {
    expect(lessonContentToTiptapDocument(null)).toEqual(EMPTY_TIPTAP_DOCUMENT);
    expect(lessonContentToTiptapDocument({})).toEqual(EMPTY_TIPTAP_DOCUMENT);
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
