'use client';

import { useMemo, useState } from 'react';
import {
  lessonContentToTiptapDocument,
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

  const lessonContent = lessonContentToTiptapDocument(lesson?.content ?? null);

  // Build navigation including quizzes: lesson 1 → quiz 1 → lesson 2
  const { prev, next } = useMemo(() => {
    if (!modules.length) return { prev: null, next: null };

    type NavItem = {
      type: 'lesson' | 'quiz';
      id: string;
      title: string;
      href: string;
    };

    const allItems: NavItem[] = [];
    for (const mod of modules) {
      for (const lesson of mod.lessons) {
        allItems.push({
          type: 'lesson',
          id: lesson.id,
          title: lesson.title,
          href: `/courses/${courseId}/lessons/${lesson.id}`,
        });
        // Add quizzes for this lesson right after the lesson
        const lessonQuizzes = quizzes.filter((q) => q.lessonId === lesson.id);
        for (const lq of lessonQuizzes) {
          allItems.push({
            type: 'quiz',
            id: lq.id,
            title: lq.title,
            href: `/courses/${courseId}/quiz/${lq.id}`,
          });
        }
      }
    }

    const currentIdx = allItems.findIndex(
      (item) => item.type === 'lesson' && item.id === lessonId
    );
    if (currentIdx === -1) return { prev: null, next: null };

    return {
      prev: currentIdx > 0 ? allItems[currentIdx - 1] : null,
      next: currentIdx < allItems.length - 1 ? allItems[currentIdx + 1] : null,
    };
  }, [modules, quizzes, lessonId, courseId]);

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
          <LessonNavigation courseId={courseId} prev={prev} next={next} />
        </div>
      )}
    </>
  );
}
