import { describe, expect, it } from 'vitest';
import { htmlToTiptapDocument } from '@/lib/tiptap-html';
import { EMPTY_TIPTAP_DOCUMENT } from '@/utils/lesson-content';

describe('htmlToTiptapDocument', () => {
  it('converts semantic lesson HTML to a Tiptap document', () => {
    const document = htmlToTiptapDocument(
      '<h1>Cell Biology</h1><p>Hello <strong>world</strong>.</p>'
    );

    expect(document.type).toBe('doc');
    expect(document.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'heading',
          attrs: expect.objectContaining({ level: 1 }),
        }),
        expect.objectContaining({ type: 'paragraph' }),
      ])
    );
  });

  it('falls back to an empty Tiptap document for blank HTML', () => {
    expect(htmlToTiptapDocument('   ')).toEqual(EMPTY_TIPTAP_DOCUMENT);
  });
});
