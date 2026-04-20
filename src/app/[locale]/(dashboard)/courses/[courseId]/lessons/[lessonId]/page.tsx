'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { parseLessonContent } from '@/lib/lesson-content';
import { useModules } from '../../use-modules';
import { LessonContentView } from './_components/lesson-content-view';
import { LessonEditor } from './_components/lesson-editor';
import { LessonHeader } from './_components/lesson-header';
import { LessonPagination } from './_components/lesson-pagination';
import { useLesson, useUpdateLesson } from './use-lesson';

export default function LessonDetailsPage() {
  const tH = useTranslations('Courses.LessonHeader');
  const tP = useTranslations('Courses.LessonPage');
  const params = useParams();
  const courseId = params.courseId as string;
  const lessonId = params.lessonId as string;

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
    <div className="space-y-8 pb-10">
      <LessonHeader
        courseId={courseId}
        lessonId={lessonId}
        currentModuleTitle={currentModule?.title || tH('modules')}
        currentLessonTitle={lesson?.title || tH('lesson')}
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
            {tP('notFound')}
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
          <LessonContentView title={lesson.title} contentText={contentText} />
        )}
      </div>

      {!isLoading && lesson && (
        <LessonPagination courseId={courseId} prev={prev} next={next} />
      )}
    </div>
  );
}
