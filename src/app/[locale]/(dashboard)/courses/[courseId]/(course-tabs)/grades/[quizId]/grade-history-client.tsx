'use client';

import { ArrowLeft, BookOpenCheck, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Accordion } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { GradeAttemptCard } from '../grade-attempt-card';
import { useGrades } from '../use-grades';

interface GradeHistoryClientProps {
  courseId: string;
  quizId: string;
  selectedAttemptId?: string;
}

export function GradeHistoryClient({
  courseId,
  quizId,
  selectedAttemptId,
}: GradeHistoryClientProps) {
  const t = useTranslations('Courses.Grades');
  const tAttempts = useTranslations('QuizAttempts');
  const gradesQuery = useGrades(courseId);
  const attempts = (gradesQuery.data ?? []).filter(
    (attempt) => attempt.quizId === quizId
  );
  const quizTitle = attempts[0]?.quizSnapshot.title ?? t('historyTitle');
  const defaultExpandedAttempt = selectedAttemptId
    ? [selectedAttemptId]
    : undefined;

  if (gradesQuery.isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl animate-pulse space-y-6">
        <div className="h-11 w-36 rounded bg-muted" />
        <div className="space-y-3 border-b pb-5">
          <div className="h-8 w-64 rounded bg-muted" />
          <div className="h-5 max-w-xl rounded bg-muted" />
        </div>
        {[0, 1].map((item) => (
          <div key={item} className="h-56 rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }

  if (gradesQuery.isError) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center rounded-2xl border border-dashed bg-card px-6 py-14 text-center">
        <RotateCcw
          className="size-9 text-muted-foreground"
          aria-hidden="true"
        />
        <h1 className="mt-4 font-bold text-xl">{t('loadError')}</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          {t('loadErrorDescription')}
        </p>
        <Button
          variant="outline"
          className="mt-5 min-h-11"
          onClick={() => gradesQuery.refetch()}
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          {t('retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <Button variant="ghost" className="min-h-11 px-0" asChild>
        <Link href={`/courses/${courseId}/grades`}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t('backToGrades')}
        </Link>
      </Button>

      <header className="flex flex-col gap-5 border-b pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BookOpenCheck className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
              {quizTitle}
            </h1>
            <p className="mt-1 max-w-2xl text-muted-foreground text-sm leading-relaxed sm:text-base">
              {t('quizHistoryDescription', { count: attempts.length })}
            </p>
          </div>
        </div>
        <Button className="min-h-11 shrink-0" asChild>
          <Link href={`/courses/${courseId}/quiz/${quizId}`}>
            {tAttempts('takeResume')}
          </Link>
        </Button>
      </header>

      {attempts.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed bg-card px-6 py-16 text-center">
          <BookOpenCheck
            className="size-10 text-muted-foreground"
            aria-hidden="true"
          />
          <h2 className="mt-4 font-bold text-lg">{t('emptyTitle')}</h2>
          <p className="mt-2 max-w-md text-muted-foreground text-sm leading-relaxed">
            {t('emptyDescription')}
          </p>
        </div>
      ) : (
        <Accordion
          type="multiple"
          defaultValue={defaultExpandedAttempt}
          className="space-y-4"
        >
          {attempts.map((attempt) => (
            <GradeAttemptCard key={attempt.id} attempt={attempt} />
          ))}
        </Accordion>
      )}
    </div>
  );
}
