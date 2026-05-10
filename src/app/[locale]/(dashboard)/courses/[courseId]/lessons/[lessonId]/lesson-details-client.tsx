'use client';

import { useMemo, useState } from 'react';
import {
  lessonContentToTiptapDocument,
  type TiptapDocument,
} from '@/utils/lesson-content';
import { useModules } from '../../use-modules';
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

  const [showOutline, setShowOutline] = useState(false);

  const lessonContent = lessonContentToTiptapDocument(lesson?.content ?? null);

  const { prev, next } = useMemo(
    () => getAdjacentLessons(lessonId),
    [getAdjacentLessons, lessonId]
  );

  const currentModule = useMemo(
    () => modules.find((m) => m.lessons.some((l) => l.id === lessonId)),
    [modules, lessonId]
  );

  const handleSave = (
    data: { title: string; content: TiptapDocument | string },
    options: { onSuccess: () => void }
  ) => {
    handleUpdateLesson(
      { lessonId, title: data.title, content: data.content },
      { onSuccess: options.onSuccess }
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
        showOutline={showOutline}
        setShowOutline={setShowOutline}
      />

      <div className="flex flex-col">
        {isLoading ? (
          <div className="mt-4 min-h-100 animate-pulse rounded-md bg-muted" />
        ) : !lesson ? (
          <p className="py-10 text-center text-muted-foreground">
            {notFoundLabel}
          </p>
        ) : (
          <LessonEditor
            key={lesson.id}
            title={lesson.title}
            content={lessonContent}
            canEdit={lesson.canEdit}
            emptyContentLabel={emptyContentLabel}
            isUpdatingLesson={isUpdatingLesson}
            onSave={handleSave}
          />
        )}
      </div>

      {!isLoading && lesson && (
        <div className="mt-8">
          <LessonPagination courseId={courseId} prev={prev} next={next} />
        </div>
      )}
    </>
  );
}
