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
import { generateJSON } from '@tiptap/html';
import { StarterKit } from '@tiptap/starter-kit';
import {
  EMPTY_TIPTAP_DOCUMENT,
  isTiptapDocument,
  type TiptapDocument,
} from '@/utils/lesson-content';

const lessonContentExtensions = [
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
];

export function htmlToTiptapDocument(html: string): TiptapDocument {
  if (html.trim().length === 0) return EMPTY_TIPTAP_DOCUMENT;

  const document = generateJSON(html, lessonContentExtensions);

  return isTiptapDocument(document) ? document : EMPTY_TIPTAP_DOCUMENT;
}
