import { Highlight } from '@tiptap/extension-highlight';
import { HorizontalRule } from '@tiptap/extension-horizontal-rule';
import { Image } from '@tiptap/extension-image';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { TextAlign } from '@tiptap/extension-text-align';
import { Typography } from '@tiptap/extension-typography';
import { Youtube } from '@tiptap/extension-youtube';
import { Selection } from '@tiptap/extensions';
import { MarkdownManager } from '@tiptap/markdown';
import { StarterKit } from '@tiptap/starter-kit';
import type { TiptapDocument } from '@/utils/lesson-content';
import { normalizeLessonMarkdown } from '@/utils/lesson-content-rag';

const lessonContentMarkdownManager = new MarkdownManager({
  extensions: [
    StarterKit.configure({
      horizontalRule: false,
      link: {
        openOnClick: true,
        enableClickSelection: true,
      },
    }),
    HorizontalRule,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Highlight.configure({ multicolor: true }),
    Image,
    Youtube.configure({
      addPasteHandler: true,
    }),
    Typography,
    Superscript,
    Subscript,
    Selection,
  ],
});

export function tiptapDocumentToMarkdown(document: TiptapDocument): string {
  return normalizeLessonMarkdown(
    lessonContentMarkdownManager.serialize(document)
  );
}
