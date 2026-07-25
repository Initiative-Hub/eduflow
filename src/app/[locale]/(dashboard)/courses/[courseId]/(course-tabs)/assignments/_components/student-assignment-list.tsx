'use client';

import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  Inbox,
  Timer,
} from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { AssignmentListItem } from '@/app/[locale]/(dashboard)/courses/[courseId]/assignments/assignment.service';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { AssignmentDueDate } from './assignment-due-date';
import type { AssignmentFilter } from './assignment-list-types';
import { getStudentStatus } from './assignment-list-types';
import { EmptyState } from './assignment-list-states';

export function StudentAssignmentList({
  assignments,
  allAssignmentsCount,
  courseId,
  locale,
  now,
  filter,
  counts,
  search,
  onFilterChange,
  onSearchChange,
}: {
  assignments: AssignmentListItem[];
  allAssignmentsCount: number;
  courseId: string;
  locale: string;
  now: number;
  filter: AssignmentFilter;
  counts: Record<AssignmentFilter, number>;
  search: string;
  onFilterChange: (filter: AssignmentFilter) => void;
  onSearchChange: (search: string) => void;
}) {
  const t = useTranslations('Courses.Assignments');

  return (
    <div className="space-y-4">
      <StudentFilters
        filter={filter}
        counts={counts}
        search={search}
        onFilterChange={onFilterChange}
        onSearchChange={onSearchChange}
      />

      {assignments.length === 0 ? (
        <EmptyState
          message={
            allAssignmentsCount === 0
              ? t('noAssignments')
              : t('noFilteredAssignments')
          }
        />
      ) : (
        <div className="space-y-3">
          {assignments.map((assignment) => (
            <StudentAssignmentCard
              key={assignment.id}
              assignment={assignment}
              courseId={courseId}
              locale={locale}
              now={now}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StudentFilters({
  filter,
  counts,
  search,
  onFilterChange,
  onSearchChange,
}: {
  filter: AssignmentFilter;
  counts: Record<AssignmentFilter, number>;
  search: string;
  onFilterChange: (filter: AssignmentFilter) => void;
  onSearchChange: (search: string) => void;
}) {
  const t = useTranslations('Courses.Assignments');

  const filters: Array<{
    value: AssignmentFilter;
    label: string;
  }> = [
    { value: 'all', label: t('all') },
    { value: 'pending', label: t('pending') },
    { value: 'completed', label: t('completed') },
  ];

  return (
    <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div
        className="flex w-fit items-center rounded-full bg-muted p-1"
        role="tablist"
        aria-label={t('filterAssignments')}
      >
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={filter === item.value}
            onClick={() => onFilterChange(item.value)}
            className={cn(
              'rounded-full px-4 py-2 font-medium text-sm transition-colors',
              'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              filter === item.value
                ? 'bg-background text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {item.label}
            <span className="ml-1.5 text-xs tabular-nums">
              {counts[item.value]}
            </span>
          </button>
        ))}
      </div>

      <div className="relative w-full sm:w-64">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchPlaceholder')}
          className="pl-9"
        />
      </div>
    </div>
  );
}

function StudentAssignmentCard({
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
  const status = getStudentStatus(assignment);

  return (
    <Link
      href={`/courses/${courseId}/assignments/${assignment.id}`}
      className={cn(
        'group block rounded-2xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        status === 'completed' && 'opacity-85'
      )}
    >
      <div className="flex items-center gap-4">
        <span
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-xl',
            status === 'completed'
              ? 'bg-primary/10 text-primary'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {status === 'completed' ? (
            <CheckCircle2 className="size-5" aria-hidden="true" />
          ) : (
            <FileText className="size-5" aria-hidden="true" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
            <h2
              className={cn(
                'line-clamp-2 font-semibold text-base leading-6',
                status === 'completed' &&
                  'text-muted-foreground line-through decoration-muted-foreground/60'
              )}
            >
              {assignment.title}
            </h2>

            <StudentStatusBadge assignment={assignment} />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground text-sm">
            <AssignmentDueDate
              dueAt={assignment.dueAt}
              locale={locale}
              now={now}
            />

            <span>
              {assignment.maxPoints} {t('points')}
            </span>
          </div>
        </div>

        <div className="hidden items-center gap-3 sm:flex">
          {status === 'completed' &&
          assignment.submission &&
          assignment.submission.score !== null ? (
            <span className="rounded-lg bg-primary/5 px-3 py-2 font-bold text-primary tabular-nums">
              {assignment.submission.score}/{assignment.maxPoints}
            </span>
          ) : null}

          <ArrowRight
            className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary"
            aria-hidden="true"
          />
        </div>
      </div>
    </Link>
  );
}

function StudentStatusBadge({
  assignment,
}: {
  assignment: AssignmentListItem;
}) {
  const t = useTranslations('Courses.Assignments');
  const status = getStudentStatus(assignment);

  if (status === 'completed') {
    return (
      <Badge variant="default" className="gap-1.5">
        <CheckCircle2 aria-hidden="true" />
        {t('completed')}
      </Badge>
    );
  }

  if (status === 'awaitingGrade') {
    return (
      <Badge variant="outline" className="gap-1.5">
        <Timer aria-hidden="true" />
        {t('awaitingGrade')}
      </Badge>
    );
  }

  if (status === 'inProgress') {
    return (
      <Badge variant="secondary" className="gap-1.5">
        <Clock3 aria-hidden="true" />
        {t('inProgress')}
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="gap-1.5">
      <Inbox aria-hidden="true" />
      {t('notStarted')}
    </Badge>
  );
}
