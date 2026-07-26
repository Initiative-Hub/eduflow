'use client';

import { CheckCircle2, Clock3, Inbox } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import type { Assignment } from '@/app/[locale]/(dashboard)/courses/[courseId]/assignments/assignment.service';
import {
  useAssignmentSubmissions,
  useGradeSubmission,
} from '@/app/[locale]/(dashboard)/courses/[courseId]/assignments/use-assignment';
import { TeacherSubmissionReview } from '@/components/assignments/teacher-submission-review';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function TeacherSubmissionsPanel({
  assignment,
}: {
  assignment: Assignment;
}) {
  const t = useTranslations('Courses.AssignmentTeacher');
  const locale = useLocale();
  const submissionsQuery = useAssignmentSubmissions(assignment.id);
  const gradeMutation = useGradeSubmission(assignment.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (submissionsQuery.isLoading) {
    return <SubmissionsSkeleton />;
  }

  const submissions = submissionsQuery.data ?? [];
  const selected =
    submissions.find((submission) => submission.id === selectedId) ??
    submissions[0];
  const pendingCount = submissions.filter(
    (submission) => submission.status !== 'GRADED'
  ).length;
  const gradedCount = submissions.length - pendingCount;

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex flex-col gap-4 border-b px-5 py-5 sm:flex-row sm:items-center sm:justify-between md:px-6">
        <div>
          <h2 className="font-semibold text-xl tracking-tight">{t('title')}</h2>
          <p className="mt-1 text-muted-foreground text-sm">
            {t('description', { count: submissions.length })}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1.5">
            <Clock3 />
            {t('pendingCount', { count: pendingCount })}
          </Badge>
          <Badge variant="secondary" className="gap-1.5">
            <CheckCircle2 />
            {t('gradedCount', { count: gradedCount })}
          </Badge>
        </div>
      </div>

      {selected ? (
        <div className="grid min-h-136 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="border-b bg-muted/20 lg:border-r lg:border-b-0">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <p className="font-semibold text-sm">{t('studentList')}</p>
              <span className="text-muted-foreground text-xs tabular-nums">
                {t('totalCount', { count: submissions.length })}
              </span>
            </div>

            <div className="max-h-72 overflow-y-auto p-2 lg:max-h-136">
              {submissions.map((submission) => {
                const studentName = submission.student?.name ?? t('student');
                const active = submission.id === selected.id;

                return (
                  <button
                    key={submission.id}
                    type="button"
                    aria-label={t('reviewStudent', { name: studentName })}
                    aria-current={active ? 'true' : undefined}
                    onClick={() => setSelectedId(submission.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors',
                      'hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                      active && 'bg-primary/10'
                    )}
                  >
                    <Avatar>
                      <AvatarFallback>
                        {getInitials(studentName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-sm">
                        {studentName}
                      </span>
                      <span className="mt-0.5 block truncate text-muted-foreground text-xs">
                        {submission.submittedAt
                          ? formatSubmissionDate(submission.submittedAt, locale)
                          : t('notSubmitted')}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'size-2 shrink-0 rounded-full',
                        submission.status === 'GRADED'
                          ? 'bg-primary'
                          : 'bg-muted-foreground/50'
                      )}
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>
          </aside>

          <TeacherSubmissionReview
            key={selected.id}
            assignment={assignment}
            submission={selected}
            isSaving={gradeMutation.isPending}
            onGrade={(data) =>
              gradeMutation.mutate({
                submissionId: selected.id,
                ...data,
              })
            }
          />
        </div>
      ) : (
        <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Inbox className="size-5" />
          </span>
          <h3 className="mt-4 font-semibold">{t('noSubmissions')}</h3>
          <p className="mt-1 max-w-sm text-muted-foreground text-sm">
            {t('noSubmissionsDescription')}
          </p>
        </div>
      )}
    </section>
  );
}

function SubmissionsSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="space-y-2 border-b p-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid min-h-96 lg:grid-cols-[18rem_1fr]">
        <Skeleton className="m-4 h-52" />
        <Skeleton className="m-6 h-72" />
      </div>
    </div>
  );
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function formatSubmissionDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(value));
}
