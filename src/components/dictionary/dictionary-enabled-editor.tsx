'use client';

import Document from '@tiptap/extension-document';
import History from '@tiptap/extension-history';
import Paragraph from '@tiptap/extension-paragraph';
import Placeholder from '@tiptap/extension-placeholder';
import Text from '@tiptap/extension-text';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { EditorContent, Extension, useEditor } from '@tiptap/react';
import { useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface DictionaryEnabledEditorProps {
  value: string;
  onChange: (value: string) => void;
  onWordLookup: (
    word: string,
    anchor: { getBoundingClientRect: () => DOMRect }
  ) => void;
  onClearLookup: () => void;
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
  /** Expected input language. 'vi' disables all hover/click effects. */
  language?: 'en' | 'vi';
}

const HoverWordPluginKey = new PluginKey('hoverWord');

/**
 * Returns true when an ASCII match is embedded inside a Unicode word
 * (e.g. "huy" within "huyền"). In that case we should not highlight it.
 */
function isEmbeddedInUnicodeWord(
  text: string,
  matchStart: number,
  matchEnd: number
): boolean {
  const before = matchStart > 0 ? text[matchStart - 1] : '';
  const after = matchEnd < text.length ? text[matchEnd] : '';
  // \p{L} matches any Unicode letter (including Vietnamese diacritics)
  return /\p{L}/u.test(before) || /\p{L}/u.test(after);
}

function getHoverWordPlugin(
  onWordClick: (
    word: string,
    anchor: { getBoundingClientRect: () => DOMRect }
  ) => void,
  language: 'en' | 'vi' = 'en'
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clearDecorations = (view: any) => {
    const current = HoverWordPluginKey.getState(view.state);
    if (current && current !== DecorationSet.empty) {
      const tr = view.state.tr.setMeta(HoverWordPluginKey, {
        type: 'updateHover',
        decorations: DecorationSet.empty,
      });
      view.dispatch(tr);
    }
  };

  return new Plugin({
    key: HoverWordPluginKey,
    state: {
      init() {
        return DecorationSet.empty;
      },
      apply(tr, oldState) {
        const meta = tr.getMeta(HoverWordPluginKey);
        if (meta && meta.type === 'updateHover') {
          return meta.decorations;
        }
        return oldState.map(tr.mapping, tr.doc);
      },
    },
    props: {
      decorations(state) {
        return this.getState(state);
      },
      handleDOMEvents: {
        mousemove(view, event) {
          // Vietnamese input — no hover effects
          if (language === 'vi') {
            clearDecorations(view);
            return false;
          }

          const coords = { left: event.clientX, top: event.clientY };
          const pos = view.posAtCoords(coords);

          if (!pos) {
            clearDecorations(view);
            return false;
          }

          const resolved = view.state.doc.resolve(pos.pos);
          if (!resolved.parent.isTextblock) {
            clearDecorations(view);
            return false;
          }

          const text = resolved.parent.textContent;
          const offset = resolved.parentOffset;

          const wordRegex = /[a-zA-Z'-]+/g;
          let match: RegExpExecArray | null = wordRegex.exec(text);
          let foundMatch = null;
          while (match !== null) {
            if (
              offset >= match.index &&
              offset <= match.index + match[0].length
            ) {
              // Skip tokens that are sub-strings of Vietnamese words
              if (
                isEmbeddedInUnicodeWord(
                  text,
                  match.index,
                  match.index + match[0].length
                )
              ) {
                break;
              }
              foundMatch = match;
              break;
            }
            match = wordRegex.exec(text);
          }

          if (!foundMatch) {
            clearDecorations(view);
            return false;
          }

          const start = resolved.start() + foundMatch.index;
          const end = start + foundMatch[0].length;

          const currentDecorations = HoverWordPluginKey.getState(
            view.state
          ) as DecorationSet;
          const existing = currentDecorations.find(start, end);
          if (
            existing.length > 0 &&
            existing[0].from === start &&
            existing[0].to === end
          ) {
            return false; // Already decorated this exact word
          }

          const dec = Decoration.inline(start, end, {
            class:
              'text-primary underline decoration-primary decoration-2 bg-primary/10 cursor-pointer rounded-sm px-[1px] mx-[-1px]',
            nodeName: 'span',
          });

          const tr = view.state.tr.setMeta(HoverWordPluginKey, {
            type: 'updateHover',
            decorations: DecorationSet.create(view.state.doc, [dec]),
          });
          view.dispatch(tr);

          return false;
        },
        mouseleave(view) {
          clearDecorations(view);
          return false;
        },
        click(view, event) {
          // Vietnamese input — no click lookup
          if (language === 'vi') return false;

          const coords = { left: event.clientX, top: event.clientY };
          const pos = view.posAtCoords(coords);
          if (!pos) return false;

          const resolved = view.state.doc.resolve(pos.pos);
          if (!resolved.parent.isTextblock) return false;

          const text = resolved.parent.textContent;
          const offset = resolved.parentOffset;

          const wordRegex = /[a-zA-Z'-]+/g;
          let match: RegExpExecArray | null = wordRegex.exec(text);
          let foundWord = null;
          let foundStart = 0;
          let foundEnd = 0;
          while (match !== null) {
            if (
              offset >= match.index &&
              offset <= match.index + match[0].length
            ) {
              // Skip tokens embedded in Vietnamese words
              if (
                isEmbeddedInUnicodeWord(
                  text,
                  match.index,
                  match.index + match[0].length
                )
              ) {
                break;
              }
              foundWord = match[0];
              foundStart = resolved.start() + match.index;
              foundEnd = foundStart + match[0].length;
              break;
            }
            match = wordRegex.exec(text);
          }

          if (foundWord) {
            const startCoords = view.coordsAtPos(foundStart);
            const endCoords = view.coordsAtPos(foundEnd);

            const rect = {
              top: startCoords.top,
              bottom: startCoords.bottom,
              left: startCoords.left,
              right: endCoords.left,
              width: endCoords.left - startCoords.left,
              height: startCoords.bottom - startCoords.top,
              x: startCoords.left,
              y: startCoords.top,
              toJSON: () => ({}),
            };

            const anchor = { getBoundingClientRect: () => rect as DOMRect };
            onWordClick(
              foundWord.replace(/[^a-zA-Z'-]/g, '').toLowerCase(),
              anchor
            );
            return true; // prevent default to avoid selecting text? Actually let it select if it wants
          }
          return false;
        },
      },
    },
  });
}

const DictionaryHoverExtension = Extension.create<{
  onWordClick: (
    word: string,
    anchor: { getBoundingClientRect: () => DOMRect }
  ) => void;
  language: 'en' | 'vi';
}>({
  name: 'dictionaryHover',
  addOptions() {
    return {
      onWordClick: () => {},
      language: 'en' as const,
    };
  },
  addProseMirrorPlugins() {
    return [
      getHoverWordPlugin(this.options.onWordClick, this.options.language),
    ];
  },
});

export function DictionaryEnabledEditor({
  value,
  onChange,
  onWordLookup,
  onClearLookup,
  ariaLabel,
  placeholder,
  className,
  language = 'en',
}: DictionaryEnabledEditorProps) {
  const handleWordClick = useCallback(
    (word: string, anchor: { getBoundingClientRect: () => DOMRect }) => {
      onWordLookup(word, anchor);
    },
    [onWordLookup]
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      Document,
      Paragraph,
      Text,
      History,
      Placeholder.configure({ placeholder }),
      DictionaryHoverExtension.configure({
        onWordClick: handleWordClick,
        language,
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        'aria-label': ariaLabel ?? placeholder ?? 'Dictionary editor',
        class:
          'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[200px]',
        role: 'textbox',
      },
      // Ensure only plain text is pasted by letting the restricted schema strip unsupported HTML
    },
    onUpdate: ({ editor }) => {
      // Extract plain text preserving paragraph newlines
      let text = '';
      editor.state.doc.descendants((node) => {
        if (node.isBlock) {
          text += `${node.textContent}\n`;
        }
      });
      onChange(text.trimEnd());
      onClearLookup();
    },
    onSelectionUpdate: () => {
      onClearLookup();
    },
  });

  // Sync external value
  useEffect(() => {
    if (editor && value !== undefined) {
      // compare plain text to avoid endless loop
      let currentText = '';
      editor.state.doc.descendants((node) => {
        if (node.isBlock) {
          currentText += `${node.textContent}\n`;
        }
      });
      currentText = currentText.trimEnd();

      if (value !== currentText) {
        // format plain text into paragraphs for tiptap
        const htmlValue = value
          .split('\n')
          .map((line) => `<p>${line || '<br>'}</p>`)
          .join('');
        editor.commands.setContent(htmlValue, { emitUpdate: false });
      }
    }
  }, [editor, value]);

  return (
    <div
      className={cn(
        'relative w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm md:text-sm',
        className
      )}
    >
      <EditorContent editor={editor} className="h-full" />
    </div>
  );
}
