'use client';

import { Highlight } from '@tiptap/extension-highlight';
import { Image } from '@tiptap/extension-image';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { TextAlign } from '@tiptap/extension-text-align';
import { Typography } from '@tiptap/extension-typography';
import { Selection } from '@tiptap/extensions';
import { EditorContent, EditorContext, useEditor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Save } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { HorizontalRule } from '@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  isTiptapDocumentEmpty,
  type TiptapDocument,
} from '@/utils/lesson-content';
import { LessonEditorToolbar } from './lesson-editor-toolbar';
import '@/components/tiptap-node/blockquote-node/blockquote-node.scss';
import '@/components/tiptap-node/code-block-node/code-block-node.scss';
import '@/components/tiptap-node/heading-node/heading-node.scss';
import '@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss';
import '@/components/tiptap-node/image-node/image-node.scss';
import '@/components/tiptap-node/list-node/list-node.scss';
import '@/components/tiptap-node/paragraph-node/paragraph-node.scss';
import './lesson-editor.scss';

interface LessonEditorProps {
  title: string;
  content: TiptapDocument;
  readOnly?: boolean;
  emptyContentLabel: string;
  isUpdatingLesson?: boolean;
  onTitleChange?: (value: string) => void;
  onContentChange?: (value: TiptapDocument) => void;
  onCancel?: () => void;
  onSave?: (content: TiptapDocument) => void;
}

export function LessonEditor({
  title,
  content,
  readOnly = false,
  emptyContentLabel,
  isUpdatingLesson = false,
  onTitleChange,
  onContentChange,
  onCancel,
  onSave,
}: LessonEditorProps) {
  const t = useTranslations('Courses.LessonEditor');

  const editor = useEditor({
    immediatelyRender: false,
    editable: !readOnly,
    editorProps: {
      attributes: {
        'aria-label': 'Lesson content editor',
        autocomplete: 'off',
        autocorrect: 'off',
        autocapitalize: 'off',
        class: 'lesson-tiptap-editor',
      },
    },
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        link: {
          openOnClick: readOnly,
          enableClickSelection: !readOnly,
        },
      }),
      HorizontalRule,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Image,
      Typography,
      Superscript,
      Subscript,
      Selection,
    ],
    content,
    onUpdate: ({ editor: currentEditor }) => {
      onContentChange?.(currentEditor.getJSON() as TiptapDocument);
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => {
    if (!editor) return;

    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(content)) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  const isEmptyReadOnlyContent = readOnly && isTiptapDocumentEmpty(content);

  return (
    <div className="flex min-h-100 flex-col gap-6">
      {readOnly ? (
        <h1 className="font-bold text-3xl tracking-tight">{title}</h1>
      ) : (
        <div className="space-y-2">
          <label className="font-medium text-sm" htmlFor="lesson-title">
            {t('title')}
          </label>
          <Input
            id="lesson-title"
            value={title}
            onChange={(event) => onTitleChange?.(event.target.value)}
            className="font-semibold text-lg"
          />
        </div>
      )}

      <div className="lesson-editor-shell">
        <EditorContext.Provider value={{ editor }}>
          {!readOnly && <LessonEditorToolbar editor={editor} />}

          {isEmptyReadOnlyContent ? (
            <p className="min-h-100 text-muted-foreground italic">
              {emptyContentLabel}
            </p>
          ) : (
            <EditorContent
              editor={editor}
              role="presentation"
              className="lesson-editor-content"
            />
          )}
        </EditorContext.Provider>
      </div>

      {!readOnly && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            {t('cancel')}
          </Button>
          <Button
            onClick={() =>
              editor && onSave?.(editor.getJSON() as TiptapDocument)
            }
            disabled={isUpdatingLesson || !editor}
          >
            <Save className="mr-2 h-4 w-4" />
            {isUpdatingLesson ? t('saving') : t('save')}
          </Button>
        </div>
      )}
    </div>
  );
}
