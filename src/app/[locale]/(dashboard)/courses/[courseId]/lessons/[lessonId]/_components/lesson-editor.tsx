'use client';

import { Highlight } from '@tiptap/extension-highlight';
import { Image } from '@tiptap/extension-image';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { TextAlign } from '@tiptap/extension-text-align';
import { Typography } from '@tiptap/extension-typography';
import { Youtube } from '@tiptap/extension-youtube';
import { Selection } from '@tiptap/extensions';
import { EditorContent, EditorContext, useEditor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Edit3, Presentation, Save } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { HorizontalRule } from '@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { LessonAiReview } from '@/lib/lesson-ai-review';
import {
  isTiptapDocumentEmpty,
  type TiptapDocument,
} from '@/utils/lesson-content';
import DeleteLessonDialog from './delete-lesson-dialog';
import { LessonEditorToolbar } from './lesson-editor-toolbar';
import { LessonPresentation } from './lesson-presentation';
import '@/components/tiptap-node/blockquote-node/blockquote-node.scss';
import '@/components/tiptap-node/code-block-node/code-block-node.scss';
import '@/components/tiptap-node/heading-node/heading-node.scss';
import '@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss';
import '@/components/tiptap-node/image-node/image-node.scss';
import '@/components/tiptap-node/list-node/list-node.scss';
import '@/components/tiptap-node/paragraph-node/paragraph-node.scss';
import './lesson-editor.scss';

interface LessonEditorProps {
  courseId: string;
  lessonId: string;
  title: string;
  content: TiptapDocument;
  canEdit?: boolean;
  canDelete?: boolean;
  canUseLessonAI?: boolean;
  emptyContentLabel: string;
  isUpdatingLesson?: boolean;
  onSave?: (
    data: { title: string; content: TiptapDocument },
    options: { onSuccess: () => void }
  ) => void;
}

export function LessonEditor({
  courseId,
  lessonId,
  title,
  content,
  canEdit = false,
  canDelete = false,
  canUseLessonAI = false,
  emptyContentLabel,
  isUpdatingLesson = false,
  onSave,
}: LessonEditorProps) {
  const tEditor = useTranslations('Courses.LessonEditor');
  const tHeader = useTranslations('Courses.LessonHeader');

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [editContent, setEditContent] = useState(content);
  const [showPresentation, setShowPresentation] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
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
      LessonAiReview,
    ],
    content,
    onUpdate: ({ editor }) => {
      setEditContent(editor.getJSON());
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(isEditing);
  }, [editor, isEditing]);

  useEffect(() => {
    if (!editor) return;

    if (
      !isEditing &&
      JSON.stringify(editor.getJSON()) !== JSON.stringify(content)
    ) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor, isEditing]);

  useEffect(() => {
    if (isEditing) return;
    setEditTitle(title);
    setEditContent(content);
  }, [content, isEditing, title]);

  const handleStartEditing = () => {
    setEditTitle(title);
    setEditContent(content);
    editor?.commands.setContent(content, { emitUpdate: false });
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setEditTitle(title);
    setEditContent(content);
    editor?.commands.setContent(content, { emitUpdate: false });
    setIsEditing(false);
  };

  const handleSave = () => {
    onSave?.(
      {
        title: editTitle,
        content: editor?.getJSON() ?? editContent,
      },
      { onSuccess: () => setIsEditing(false) }
    );
  };

  const isEmptyContent = isTiptapDocumentEmpty(content);

  if (showPresentation) {
    return (
      <LessonPresentation
        isOpen={showPresentation}
        onClose={() => setShowPresentation(false)}
        title={title}
        content={content}
      />
    );
  }

  return (
    <EditorContext.Provider value={{ editor }}>
      <div className="sticky top-14 z-30 -mx-6 flex min-h-16 items-center justify-between gap-4 border-foreground/20 border-b bg-background/95 px-6 py-3 backdrop-blur-sm md:-mx-10 md:px-10">
        <div className="min-w-0 max-w-xs flex-1 sm:max-w-md md:max-w-lg lg:max-w-xl">
          {isEditing ? (
            <Input
              id="lesson-title"
              aria-label={tEditor('title')}
              value={editTitle}
              onChange={(event) => setEditTitle(event.target.value)}
              className="h-10 max-w-2xl font-semibold text-lg"
              disabled={isUpdatingLesson}
            />
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <h1 className="cursor-default truncate font-bold text-xl tracking-tight md:text-2xl">
                    {title}
                  </h1>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  align="start"
                  className="max-w-md break-words"
                >
                  {title}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {isEditing ? (
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelEditing}
              disabled={isUpdatingLesson}
            >
              {tEditor('cancel')}
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isUpdatingLesson || !editor}
            >
              <Save data-icon="inline-start" />
              {isUpdatingLesson ? tEditor('saving') : tEditor('save')}
            </Button>
          </div>
        ) : canEdit || canDelete ? (
          <div className="flex shrink-0 items-center gap-2">
            {canEdit ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPresentation(true)}
                  disabled={!editor}
                  className="cursor-pointer"
                >
                  <Presentation data-icon="inline-start" />
                  {tHeader('presentation')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStartEditing}
                  disabled={!editor}
                  className="cursor-pointer"
                >
                  <Edit3 data-icon="inline-start" />
                  {tHeader('edit')}
                </Button>
              </>
            ) : null}

            {canDelete && (
              <DeleteLessonDialog courseId={courseId} lessonId={lessonId} />
            )}
          </div>
        ) : null}
      </div>

      {isEditing && (
        <div className="lesson-toolbar-bar sticky top-30 z-20 -mx-6 border-foreground/20 border-b bg-background/95 px-6 py-2 backdrop-blur-sm md:-mx-10 md:px-10">
          <LessonEditorToolbar
            lessonId={lessonId}
            canUseLessonAI={canUseLessonAI}
          />
        </div>
      )}

      {!isEditing && isEmptyContent ? (
        <div className="flex min-h-100 items-center justify-center">
          <p className="text-muted-foreground italic">{emptyContentLabel}</p>
        </div>
      ) : (
        <EditorContent
          editor={editor}
          role="presentation"
          className="lesson-editor-content"
        />
      )}
    </EditorContext.Provider>
  );
}
