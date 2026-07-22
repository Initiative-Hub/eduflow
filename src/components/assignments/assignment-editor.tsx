'use client';

import { Highlight } from '@tiptap/extension-highlight';
import { Image } from '@tiptap/extension-image';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import Placeholder from '@tiptap/extension-placeholder';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { TextAlign } from '@tiptap/extension-text-align';
import { Typography } from '@tiptap/extension-typography';
import { Youtube } from '@tiptap/extension-youtube';
import { Selection } from '@tiptap/extensions';
import { EditorContent, EditorContext, useEditor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Edit3, Save } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { LessonEditorToolbar } from '@/app/[locale]/(dashboard)/courses/[courseId]/lessons/[lessonId]/_components/lesson-editor-toolbar';
import { HorizontalRule } from '@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  EMPTY_TIPTAP_DOCUMENT,
  isTiptapDocumentEmpty,
  type TiptapDocument,
} from '@/utils/lesson-content';
import '@/components/tiptap-node/blockquote-node/blockquote-node.scss';
import '@/components/tiptap-node/code-block-node/code-block-node.scss';
import '@/components/tiptap-node/heading-node/heading-node.scss';
import '@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss';
import '@/components/tiptap-node/image-node/image-node.scss';
import '@/components/tiptap-node/list-node/list-node.scss';
import '@/components/tiptap-node/paragraph-node/paragraph-node.scss';
import '@/app/[locale]/(dashboard)/courses/[courseId]/lessons/[lessonId]/_components/lesson-editor.scss';
import './assignment-editor.scss';

type AssignmentEditorProps = {
  title: string;
  content: TiptapDocument;
  canEdit: boolean;
  appearance?: 'page' | 'embedded';
  startEditing?: boolean;
  hideTitleInput?: boolean;
  isSaving?: boolean;
  onSave?: (
    data: {
      title: string;
      content: TiptapDocument;
    },
    options: {
      onSuccess: () => void;
    }
  ) => void;
};

export function AssignmentEditor({
  title,
  content = EMPTY_TIPTAP_DOCUMENT,
  canEdit,
  appearance = 'page',
  startEditing = false,
  hideTitleInput = false,
  isSaving = false,
  onSave,
}: AssignmentEditorProps) {
  const t = useTranslations('Courses.AssignmentEditor');

  const [isEditing, setIsEditing] = useState(startEditing);
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftContent, setDraftContent] = useState(content);

  const editor = useEditor({
    immediatelyRender: false,
    editable: canEdit && startEditing,
    content,
    editorProps: {
      attributes: {
        'aria-label': t('content'),
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
          openOnClick: true,
          enableClickSelection: true,
        },
      }),
      HorizontalRule,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder: t('contentPlaceholder'),
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Image,
      Youtube.configure({ addPasteHandler: true }),
      Typography,
      Superscript,
      Subscript,
      Selection,
    ],
    onUpdate: ({ editor: currentEditor }) => {
      setDraftContent(currentEditor.getJSON() as TiptapDocument);
    },
  });

  useEffect(() => {
    if (hideTitleInput) {
      setDraftTitle(title);
    }
  }, [hideTitleInput, title]);

  useEffect(() => {
    if (!editor) return;

    editor.setEditable(canEdit && isEditing);
  }, [editor, canEdit, isEditing]);

  useEffect(() => {
    if (!editor || isEditing) return;

    editor.commands.setContent(content, {
      emitUpdate: false,
    });

    setDraftTitle(title);
    setDraftContent(content);
  }, [editor, content, title, isEditing]);

  const startEdit = () => {
    setDraftTitle(title);
    setDraftContent(content);
    editor?.commands.setContent(content, {
      emitUpdate: false,
    });
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setDraftTitle(title);
    setDraftContent(content);
    editor?.commands.setContent(content, {
      emitUpdate: false,
    });
    setIsEditing(false);
  };

  const save = () => {
    onSave?.(
      {
        title: draftTitle.trim(),
        content: (editor?.getJSON() ?? draftContent) as TiptapDocument,
      },
      { onSuccess: () => setIsEditing(false) }
    );
  };

  const empty = isTiptapDocumentEmpty(content);
  const isEmbedded = appearance === 'embedded';

  return (
    <EditorContext.Provider value={{ editor }}>
      <div
        className={
          isEmbedded
            ? 'flex min-h-18 flex-col items-stretch justify-between gap-4 border-b bg-card px-5 py-4 sm:flex-row sm:items-center md:px-6'
            : 'sticky top-14 z-30 -mx-6 flex min-h-16 items-center justify-between gap-4 border-foreground/20 border-b bg-background/95 px-6 py-3 backdrop-blur-sm md:-mx-10 md:px-10 lg:-mx-12 lg:px-12'
        }
      >
        <div className="min-w-0 flex-1">
          {isEditing && !hideTitleInput ? (
            <Input
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              aria-label={t('title')}
              className="h-10 max-w-2xl font-semibold text-lg"
            />
          ) : isEmbedded ? (
            <div>
              <h2 className="font-semibold text-lg tracking-tight">
                {t('content')}
              </h2>
              <p className="mt-0.5 text-muted-foreground text-sm">
                {t('contentDescription')}
              </p>
            </div>
          ) : (
            <h1 className="truncate font-bold text-xl tracking-tight md:text-2xl">
              {hideTitleInput ? t('content') : title}
            </h1>
          )}
        </div>

        {isEditing ? (
          <div className="flex shrink-0 justify-end gap-2">
            <Button variant="outline" onClick={cancelEdit}>
              {t('cancel')}
            </Button>
            <Button
              onClick={save}
              disabled={isSaving || !editor || !draftTitle.trim()}
            >
              <Save data-icon="inline-start" />
              {isSaving ? t('saving') : t('save')}
            </Button>
          </div>
        ) : canEdit ? (
          <Button variant="outline" onClick={startEdit}>
            <Edit3 data-icon="inline-start" />
            {t('edit')}
          </Button>
        ) : null}
      </div>

      {isEditing ? (
        <div
          className={
            isEmbedded
              ? 'lesson-toolbar-bar border-b bg-muted/30 px-3 py-1.5'
              : 'lesson-toolbar-bar sticky top-30 z-20 -mx-6 border-foreground/20 border-b bg-background/95 px-6 py-2 backdrop-blur-sm md:-mx-10 md:px-10 lg:-mx-12 lg:px-12'
          }
        >
          <LessonEditorToolbar />
        </div>
      ) : null}

      {!isEditing && empty ? (
        <p className="py-10 text-center text-muted-foreground">{t('empty')}</p>
      ) : (
        <EditorContent
          editor={editor}
          className={
            isEmbedded ? 'assignment-editor-content' : 'lesson-editor-content'
          }
        />
      )}
    </EditorContext.Provider>
  );
}
