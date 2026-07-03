'use client';

import { Award, BookOpenCheck, RotateCcw, Target } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Accordion } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { GradeAttemptCard } from './grade-attempt-card';
import { useGrades } from './use-grades';

interface GradesClientProps {
  courseId: string;
}

export function GradesClient({ courseId }: GradesClientProps) {
  const t = useTranslations('Courses.Grades');
  const gradesQuery = useGrades(courseId);
  const attempts = gradesQuery.data ?? [];
  const average = attempts.length
    ? attempts.reduce((total, attempt) => total + attempt.percentage, 0) /
      attempts.length
    : 0;
  const best = attempts.length
    ? Math.max(...attempts.map((attempt) => attempt.percentage))
    : 0;

  if (gradesQuery.isLoading) return <GradesSkeleton />;

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
      <header className="border-b pb-5">
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Award className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
              {t('title')}
            </h1>
            <p className="mt-1 max-w-2xl text-muted-foreground text-sm leading-relaxed sm:text-base">
              {t('description')}
            </p>
          </div>
        </div>
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
        <>
          <section
            aria-label={t('overview')}
            className="grid gap-3 sm:grid-cols-3"
          >
            <OverviewMetric
              icon={BookOpenCheck}
              label={t('submissions')}
              value={attempts.length.toLocaleString()}
            />
            <OverviewMetric
              icon={Target}
              label={t('averageScore')}
              value={`${Math.round(average)}%`}
            />
            <OverviewMetric
              icon={Award}
              label={t('bestScore')}
              value={`${Math.round(best)}%`}
            />
          </section>

          <section>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2 className="font-bold text-xl">{t('historyTitle')}</h2>
                <p className="mt-1 text-muted-foreground text-sm">
                  {t('historyDescription')}
                </p>
              </div>
            </div>
            <Accordion type="multiple" className="space-y-4">
              {attempts.map((attempt) => (
                <GradeAttemptCard key={attempt.id} attempt={attempt} />
              ))}
            </Accordion>
          </section>
        </>
      )}
    </div>
  );
}

function OverviewMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Award;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <div>
        <p className="text-muted-foreground text-xs uppercase tracking-wide">
          {label}
        </p>
        <p className="mt-0.5 font-bold text-2xl tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function GradesSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl animate-pulse space-y-8">
      <div className="space-y-3 border-b pb-5">
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="h-5 max-w-xl rounded bg-muted" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-24 rounded-xl bg-muted" />
        ))}
      </div>
      {[0, 1].map((item) => (
        <div key={item} className="h-56 rounded-2xl bg-muted" />
      ))}
    </div>
  );
}
