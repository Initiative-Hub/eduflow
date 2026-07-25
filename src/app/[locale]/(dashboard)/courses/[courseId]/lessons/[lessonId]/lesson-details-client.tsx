'use client';

import { useMemo, useState } from 'react';
import { useCourseNavigation } from '@/hooks/use-course-navigation';
import {
  EMPTY_TIPTAP_DOCUMENT,
  type TiptapDocument,
} from '@/utils/lesson-content';
import { useModules } from '../../use-modules';
import { useQuestionBank } from '../../use-question-bank';
import { LessonEditor } from './_components/lesson-editor';
import { LessonHeader } from './_components/lesson-header';
import { LessonNavigation } from './_components/lesson-navigation';
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
  const { modules, isLoading: isModulesLoading } = useModules(courseId);

  const { quizzes } = useQuestionBank({ courseId });
  const { lesson, isLoading: isLessonLoading } = useLesson(lessonId);
  const { isUpdatingLesson, handleUpdateLesson } = useUpdateLesson(courseId);

  const [showOutline, setShowOutline] = useState(false);

  const lessonContent = lesson?.content ?? EMPTY_TIPTAP_DOCUMENT;

  // Build navigation including quizzes: lesson 1 → quiz 1 → lesson 2
  const { prev, next } = useCourseNavigation(
    courseId,
    lessonId,
    'lesson',
    modules,
    quizzes
  );

  const currentModule = useMemo(
    () => modules.find((m) => m.lessons.some((l) => l.id === lessonId)),
    [modules, lessonId]
  );

  const handleSave = (
    data: { title: string; content: TiptapDocument },
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
            courseId={courseId}
            lessonId={lesson.id}
            title={lesson.title}
            content={lessonContent}
            canEdit={lesson.canEdit}
            canDelete={lesson.canDelete}
            canUseLessonAI={lesson.canUseLessonAI}
            emptyContentLabel={emptyContentLabel}
            isUpdatingLesson={isUpdatingLesson}
            onSave={handleSave}
          />
        )}
      </div>

      {!isLoading && lesson && (
        <div className="mt-8">
          <LessonNavigation courseId={courseId} prev={prev} next={next} />
        </div>
      )}
    </>
  );
}
