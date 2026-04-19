'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useModules, useLesson } from '../../use-modules';
import { Button } from '@/components/ui/button';
import { LessonNavigationHeader } from '../../_components/lesson-navigation-header';
import { LessonEditor } from '../../_components/lesson-editor';
import { LessonPagination } from '../../_components/lesson-pagination';

export default function LessonDetailsPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const lessonId = params.lessonId as string;

  const {
    modules,
    isLoading,
    isUpdatingLesson,
    handleUpdateLesson,
    getAdjacentLessons,
  } = useModules(courseId);
  
  const {
    lesson: fetchedLesson,
    isLoading: isLessonLoading,
  } = useLesson(lessonId);

  const [isEditing, setIsEditing] = useState(false);
  const [showOutline, setShowOutline] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  // Fallback to module's summary string data temporarily until API finishes loading
  const fallbackLesson = useMemo(() => {
    const all = modules.flatMap((m) => m.lessons);
    return all.find((l) => l.id === lessonId);
  }, [modules, lessonId]);

  const currentLesson = fetchedLesson || fallbackLesson;

  const { prev, next } = useMemo(
    () => getAdjacentLessons(lessonId),
    [getAdjacentLessons, lessonId]
  );
  
  const currentModule = useMemo(() => {
    return modules.find((m) => m.lessons.some((l) => l.id === lessonId));
  }, [modules, lessonId]);

  let contentText = '';
  if (currentLesson?.content) {
    if (typeof currentLesson.content === 'string') {
      contentText = currentLesson.content;
    } else if (typeof currentLesson.content === 'object') {
      const parsedContent = currentLesson.content as Record<string, any>;
      // Some editors store text directly under 'text', or maybe it's just raw json
      if (parsedContent && typeof parsedContent.text === 'string') {
        contentText = parsedContent.text;
      } else if (Object.keys(parsedContent).length > 0) {
        contentText = JSON.stringify(parsedContent, null, 2);
      }
    }
  }

  const handleSave = () => {
    handleUpdateLesson(
      {
        lessonId,
        title: editTitle,
        content: { text: editContent },
      },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      }
    );
  };

  const renderContent = () => {
    if (!currentLesson)
      return (
        <p className="text-muted-foreground text-center py-10 w-full">
          Lesson not found or loading...
        </p>
      );

    if (isEditing) {
      return (
        <LessonEditor
          editTitle={editTitle}
          setEditTitle={setEditTitle}
          editContent={editContent}
          setEditContent={setEditContent}
          isUpdatingLesson={isUpdatingLesson}
          onCancel={() => setIsEditing(false)}
          onSave={handleSave}
        />
      );
    }

    return (
      <div className="space-y-8 flex-1">
        <h1 className="text-3xl font-bold tracking-tight">
          {currentLesson.title}
        </h1>
        <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none min-h-[400px]">
          {contentText ? (
            <div className="whitespace-pre-wrap">{contentText}</div>
          ) : (
            <p className="text-muted-foreground italic">
              No content has been added to this lesson yet.
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-10">
      <LessonNavigationHeader
        courseId={courseId}
        lessonId={lessonId}
        currentModuleTitle={currentModule?.title || 'Modules'}
        currentLessonTitle={currentLesson?.title || 'Lesson'}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        setEditTitle={setEditTitle}
        setEditContent={setEditContent}
        originalContent={contentText}
        showOutline={showOutline}
        setShowOutline={setShowOutline}
      />

      <div className="flex flex-col w-full">
        {isLoading || isLessonLoading ? (
          <div className="space-y-4 animate-pulse w-full">
            <div className="h-10 w-2/3 bg-muted rounded-md" />
            <div className="h-64 w-full bg-muted rounded-md" />
          </div>
        ) : (
          renderContent()
        )}
      </div>

      {/* Pagination */}
      {!(isLoading || isLessonLoading) && currentLesson && (
        <LessonPagination courseId={courseId} prev={prev} next={next} />
      )}
    </div>
  );
}
