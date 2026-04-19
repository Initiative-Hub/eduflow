'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useModules } from '../../use-modules';
import { useLesson, useUpdateLesson } from '../../use-lesson';
import { parseLessonContent } from '@/lib/lesson-content';
import { LessonHeader } from '../../_components/lesson-header';
import { LessonEditor } from '../../_components/lesson-editor';
import { LessonPagination } from '../../_components/lesson-pagination';
import { LessonContentView } from '../../_components/lesson-content-view';

export default function LessonDetailsPage() {
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
        currentModuleTitle={currentModule?.title || 'Modules'}
        currentLessonTitle={lesson?.title || 'Lesson'}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        setEditTitle={setEditTitle}
        setEditContent={setEditContent}
        originalContent={contentText}
        showOutline={showOutline}
        setShowOutline={setShowOutline}
      />

      <div className="flex flex-col w-full">
        {isLoading ? (
          <div className="space-y-4 animate-pulse w-full">
            <div className="h-10 w-2/3 bg-muted rounded-md" />
            <div className="h-64 w-full bg-muted rounded-md" />
          </div>
        ) : !lesson ? (
          <p className="text-muted-foreground text-center py-10 w-full">
            Lesson not found.
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
