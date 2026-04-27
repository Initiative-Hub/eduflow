'use client';

import { useMemo, useState } from 'react';
import { parseLessonContent } from '@/utils/lesson-content';
import { useModules } from '../../use-modules';
import { LessonContentView } from './_components/lesson-content-view';
import { LessonEditor } from './_components/lesson-editor';
import { LessonHeader } from './_components/lesson-header';
import { LessonPagination } from './_components/lesson-pagination';
import { useLesson, useUpdateLesson } from './use-lesson';

interface LessonDetailsClientProps {
  courseId: string;
  lessonId: string;
  moduleFallbackTitle: string;
  lessonFallbackTitle: string;
  notFoundLabel: string;
  emptyContentLabel: string;
}

export function LessonDetailsClient({
  courseId,
  lessonId,
  moduleFallbackTitle,
  lessonFallbackTitle,
  notFoundLabel,
  emptyContentLabel,
}: LessonDetailsClientProps) {
  const {
    modules,
    isLoading: isModulesLoading,
    getAdjacentLessons,
  } = useModules(courseId);

  const { lesson, isLoading: isLessonLoading } = useLesson(lessonId);
  const { isUpdatingLesson, handleUpdateLesson } = useUpdateLesson(courseId);

  const [isEditing, setIsEditing] = useState(false);
  const [showOutline, setShowOutline] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  const contentText = parseLessonContent(lesson?.content ?? null);

  const { prev, next } = useMemo(
    () => getAdjacentLessons(lessonId),
    [getAdjacentLessons, lessonId]
  );

  const currentModule = useMemo(
    () => modules.find((m) => m.lessons.some((l) => l.id === lessonId)),
    [modules, lessonId]
  );

  const handleSave = () => {
    handleUpdateLesson(
      { lessonId, title: editTitle, content: { text: editContent } },
      { onSuccess: () => setIsEditing(false) }
    );
  };

  const isLoading = isModulesLoading || isLessonLoading;

  return (
    <>
      <LessonHeader
        courseId={courseId}
        lessonId={lessonId}
        currentModuleTitle={currentModule?.title || moduleFallbackTitle}
        currentLessonTitle={lesson?.title || lessonFallbackTitle}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        setEditTitle={setEditTitle}
        setEditContent={setEditContent}
        originalContent={contentText}
        showOutline={showOutline}
        setShowOutline={setShowOutline}
      />

      <div className="flex w-full flex-col">
        {isLoading ? (
          <div className="w-full animate-pulse space-y-4">
            <div className="h-10 w-2/3 rounded-md bg-muted" />
            <div className="h-64 w-full rounded-md bg-muted" />
          </div>
        ) : !lesson ? (
          <p className="w-full py-10 text-center text-muted-foreground">
            {notFoundLabel}
          </p>
        ) : isEditing ? (
          <LessonEditor
            editTitle={editTitle}
            setEditTitle={setEditTitle}
            editContent={editContent}
            setEditContent={setEditContent}
            isUpdatingLesson={isUpdatingLesson}
            onCancel={() => setIsEditing(false)}
            onSave={handleSave}
          />
        ) : (
          <LessonContentView
            title={lesson.title}
            contentText={contentText}
            emptyContentLabel={emptyContentLabel}
          />
        )}
      </div>

      {!isLoading && lesson && (
        <LessonPagination courseId={courseId} prev={prev} next={next} />
      )}
    </>
  );
}
