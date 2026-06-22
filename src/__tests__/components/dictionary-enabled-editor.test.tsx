import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DictionaryEnabledEditor } from '@/components/dictionary/dictionary-enabled-editor';

const { extensionCreateMock, useEditorMock } = vi.hoisted(() => ({
  extensionCreateMock: vi.fn((config) => ({
    ...config,
    configure: vi.fn((options) => ({ ...config, options })),
  })),
  useEditorMock: vi.fn(),
}));

vi.mock('@tiptap/react', () => ({
  EditorContent: ({ className }: { className?: string }) => (
    <div className={className} data-testid="editor-content" />
  ),
  Extension: {
    create: extensionCreateMock,
  },
  useEditor: useEditorMock,
}));

describe('DictionaryEnabledEditor', () => {
  it('explicitly defers Tiptap rendering for Next.js hydration safety', () => {
    useEditorMock.mockReturnValue(null);

    render(
      <DictionaryEnabledEditor
        value="hello"
        onChange={vi.fn()}
        onWordLookup={vi.fn()}
        onClearLookup={vi.fn()}
        placeholder="Type here"
      />
    );

    expect(useEditorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'hello',
        immediatelyRender: false,
      })
    );
  });
});
