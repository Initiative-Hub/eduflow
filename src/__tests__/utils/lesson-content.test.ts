import { describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import { StarterKit } from '@tiptap/starter-kit';
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

  it('provides an editable paragraph for a new Tiptap document', () => {
    const editor = new Editor({
      extensions: [StarterKit],
      content: EMPTY_TIPTAP_DOCUMENT,
    });

    expect(editor.state.doc.childCount).toBe(1);
    expect(editor.commands.insertContent('Assignment instructions')).toBe(true);
    expect(editor.getText()).toBe('Assignment instructions');

    editor.destroy();
  });
});
