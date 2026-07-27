'use client';

import { ArrowRight, FileText } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { AssignmentListItem } from '@/app/[locale]/(dashboard)/courses/[courseId]/assignments/assignment.service';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AssignmentDueDate } from './assignment-due-date';

export function TeacherAssignmentList({
  assignments,
  courseId,
  locale,
  now,
}: {
  assignments: AssignmentListItem[];
  courseId: string;
  locale: string;
  now: number;
}) {
  return (
    <div className="space-y-3">
      {assignments.map((assignment) => (
        <TeacherAssignmentCard
          key={assignment.id}
          assignment={assignment}
          courseId={courseId}
          locale={locale}
          now={now}
        />
      ))}
    </div>
  );
}

function TeacherAssignmentCard({
  assignment,
  courseId,
  locale,
  now,
}: {
  assignment: AssignmentListItem;
  courseId: string;
  locale: string;
  now: number;
}) {
  const t = useTranslations('Courses.Assignments');

  const summary = assignment.submissionSummary ?? {
    total: 0,
    pending: 0,
    graded: 0,
  };

  const completion =
    summary.total > 0 ? Math.round((summary.graded / summary.total) * 100) : 0;
  const needsReview = summary.pending > 0;

  return (
    <Link
      href={`/courses/${courseId}/assignments/${assignment.id}`}
      className="group block rounded-2xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:p-5"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_12rem_14rem_auto] lg:items-center">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileText className="size-5" aria-hidden="true" />
          </span>

          <div className="min-w-0">
            <h2 className="line-clamp-2 font-semibold text-base leading-6">
              {assignment.title}
            </h2>

            <p className="mt-1 text-muted-foreground text-sm">
              {assignment.maxPoints} {t('points')}
            </p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium tabular-nums">
              {summary.graded}/{summary.total}
            </span>

            <Badge variant={needsReview ? 'default' : 'secondary'}>
              {needsReview
                ? t('needsReview', { count: summary.pending })
                : summary.total > 0
                  ? t('fullyGraded')
                  : t('collecting')}
            </Badge>
          </div>

          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${completion}%` }}
            />
          </div>
        </div>

        <AssignmentDueDate dueAt={assignment.dueAt} locale={locale} now={now} />

        <span
          className={cn(
            'inline-flex items-center justify-center gap-2 rounded-full border px-3 py-2 font-medium text-sm transition-colors',
            'group-hover:border-primary/50 group-hover:text-primary'
          )}
        >
          {needsReview ? t('review') : t('manage')}
          <ArrowRight className="size-4" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
