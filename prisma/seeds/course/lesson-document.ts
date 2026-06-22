import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
import {
  isTiptapDocument,
  type TiptapDocument,
} from '../../../src/utils/lesson-content';

const lessonMarkdownManager = new MarkdownManager({
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

export function markdownLessonDocument(markdown: string): TiptapDocument {
  const document = lessonMarkdownManager.parse(markdown);

  if (!isTiptapDocument(document)) {
    throw new Error(
      'Markdown lesson content did not produce a Tiptap document.'
    );
  }

  return document;
}

export function readMarkdownLessonDocument(path: string): TiptapDocument {
  const normalizedPath = path.trim();

  const filePath = resolve(
    process.cwd(),
    'prisma/seeds/course',
    normalizedPath
  );

  if (!existsSync(filePath)) {
    throw new Error(`Missing Markdown lesson file: ${filePath}`);
  }

  return markdownLessonDocument(readFileSync(filePath, 'utf8'));
}
