'use client';

import { BookOpen, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { InlineConfirm } from '@/components/custom/inline-confirm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  QUESTION_SUB_TYPE_LABELS,
  QUIZ_CATEGORIES,
  type QuestionBankEntry,
} from '@/lib/quiz-template';
import type { Module } from '../../use-modules';

interface QuestionListProps {
  questions: QuestionBankEntry[];
  modules: Module[];
  isLoading: boolean;
  isDeletingQuestion: boolean;
  onDelete: (questionId: string) => void;
  onPreview: (question: QuestionBankEntry) => void;
}

export function QuestionList({
  questions,
  modules,
  isLoading,
  isDeletingQuestion,
  onDelete,
  onPreview,
}: QuestionListProps) {
  const t = useTranslations('Courses.QuestionBank');
  const allLessons = modules.flatMap((m) => m.lessons);

  const getLessonTitle = (lessonId: string | null) => {
    if (!lessonId) return t('noLesson');
    const lesson = allLessons.find((l) => l.id === lessonId);
    return lesson?.title ?? t('unknownLesson');
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-card/50 p-16 text-center">
        <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
        <p className="text-muted-foreground">{t('noQuestions')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {questions.map((question) => (
        <div
          key={question.id}
          role="button"
          tabIndex={0}
          className="group flex w-full cursor-pointer items-start justify-between rounded-lg border bg-card p-4 text-left transition-colors hover:bg-muted/40"
          onClick={() => onPreview(question)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onPreview(question);
            }
          }}
        >
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 font-medium text-foreground text-sm">
              {question.prompt}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className="text-xs">
                {QUIZ_CATEGORIES[question.category].label}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {QUESTION_SUB_TYPE_LABELS[question.subType]}
              </Badge>
              {question.lessonId && (
                <Badge variant="outline" className="text-xs">
                  <BookOpen className="mr-1 h-3 w-3" />
                  {getLessonTitle(question.lessonId)}
                </Badge>
              )}
            </div>
          </div>
          <div
            className="ml-3 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <InlineConfirm
              trigger={
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              }
              confirmLabel={t('confirmDelete')}
              cancelLabel={t('cancel')}
              onConfirm={() => onDelete(question.id)}
              isLoading={isDeletingQuestion}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
