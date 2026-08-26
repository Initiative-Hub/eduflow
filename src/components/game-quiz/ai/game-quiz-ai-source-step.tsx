'use client';

import { AlertCircle, BookOpen, RefreshCw } from 'lucide-react';
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { GameQuizCopy } from '../copy';
import type { GameQuizAiSourceCourse } from '../types';

interface GameQuizAiSourceStepProps {
  copy: GameQuizCopy;
  courses: GameQuizAiSourceCourse[];
  courseId: string;
  lessonIds: string[];
  isPending: boolean;
  isError: boolean;
  onCourseChange: (courseId: string) => void;
  onLessonToggle: (lessonId: string) => void;
  onRetry: () => void;
}

function SourceSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-8 w-44" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

export function GameQuizAiSourceStep({
  copy,
  courses,
  courseId,
  lessonIds,
  isPending,
  isError,
  onCourseChange,
  onLessonToggle,
  onRetry,
}: GameQuizAiSourceStepProps) {
  if (isPending) return <SourceSkeleton />;

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle aria-hidden="true" />
        <AlertTitle>{copy.aiGenerate.sourceLoadErrorTitle}</AlertTitle>
        <AlertDescription>
          {copy.aiGenerate.sourceLoadErrorDescription}
        </AlertDescription>
        <AlertAction>
          <Button onClick={onRetry} size="sm" type="button" variant="outline">
            <RefreshCw data-icon="inline-start" aria-hidden="true" />
            {copy.common.retry}
          </Button>
        </AlertAction>
      </Alert>
    );
  }

  if (courses.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BookOpen aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>{copy.aiGenerate.noSourcesTitle}</EmptyTitle>
          <EmptyDescription>
            {copy.aiGenerate.noSourcesDescription}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const selectedCourse = courses.find((course) => course.id === courseId);
  const lessonCount = selectedCourse?.modules.reduce(
    (count, module) => count + module.lessons.length,
    0
  );

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="game-quiz-ai-course">
          {copy.aiGenerate.courseLabel}
        </FieldLabel>
        <Select value={courseId} onValueChange={onCourseChange}>
          <SelectTrigger id="game-quiz-ai-course" className="w-full">
            <SelectValue placeholder={copy.aiGenerate.coursePlaceholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>

      {selectedCourse ? (
        <FieldSet>
          <div className="flex items-center justify-between gap-3">
            <FieldLegend>{copy.aiGenerate.lessonsLabel}</FieldLegend>
            <Badge variant="secondary">
              {lessonIds.length} {copy.aiGenerate.lessonsSelected}
            </Badge>
          </div>

          {lessonCount ? (
            <ScrollArea className="h-60 rounded-xl border p-3">
              <div className="flex flex-col gap-5">
                {selectedCourse.modules.map((module) =>
                  module.lessons.length > 0 ? (
                    <FieldSet key={module.id}>
                      <FieldLegend variant="label">{module.title}</FieldLegend>
                      <FieldGroup data-slot="checkbox-group">
                        {module.lessons.map((lesson) => {
                          const checked = lessonIds.includes(lesson.id);
                          const disabled = !checked && lessonIds.length >= 20;
                          const inputId = `game-quiz-ai-lesson-${lesson.id}`;
                          return (
                            <Field
                              key={lesson.id}
                              data-disabled={disabled || undefined}
                              orientation="horizontal"
                            >
                              <Checkbox
                                id={inputId}
                                checked={checked}
                                disabled={disabled}
                                onCheckedChange={() =>
                                  onLessonToggle(lesson.id)
                                }
                              />
                              <FieldLabel htmlFor={inputId}>
                                {lesson.title}
                              </FieldLabel>
                            </Field>
                          );
                        })}
                      </FieldGroup>
                    </FieldSet>
                  ) : null
                )}
              </div>
            </ScrollArea>
          ) : (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BookOpen aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>{copy.aiGenerate.noLessonsTitle}</EmptyTitle>
                <EmptyDescription>
                  {copy.aiGenerate.noLessonsDescription}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}

          {lessonIds.length >= 20 ? (
            <FieldDescription>
              {copy.aiGenerate.lessonSelectionLimit}
            </FieldDescription>
          ) : null}
        </FieldSet>
      ) : null}
    </FieldGroup>
  );
}
