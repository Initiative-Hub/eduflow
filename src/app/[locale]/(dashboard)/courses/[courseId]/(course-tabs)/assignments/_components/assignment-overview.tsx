'use client';

import { CalendarClock, ClipboardCheck, FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { AssignmentListItem } from '@/app/[locale]/(dashboard)/courses/[courseId]/assignments/assignment.service';

export function TeacherOverview({
  assignments,
  now,
}: {
  assignments: AssignmentListItem[];
  now: number;
}) {
  const t = useTranslations('Courses.Assignments');

  const activeAssignments = assignments.length;
  const needsGrading = assignments.reduce(
    (total, assignment) => total + (assignment.submissionSummary?.pending ?? 0),
    0
  );
  const upcomingDeadlines = assignments.filter((assignment) => {
    if (!assignment.dueAt) {
      return false;
    }

    const dueAt = new Date(assignment.dueAt).getTime();
    const nextWeek = now + 7 * 24 * 60 * 60 * 1000;

    return dueAt >= now && dueAt <= nextWeek;
  }).length;

  const cards = [
    {
      icon: ClipboardCheck,
      label: t('activeAssignments'),
      value: activeAssignments,
      hint: t('thisTerm'),
    },
    {
      icon: FileText,
      label: t('needsGrading'),
      value: needsGrading,
      hint: t('submissions'),
    },
    {
      icon: CalendarClock,
      label: t('upcomingDeadlines'),
      value: upcomingDeadlines,
      hint: t('nextSevenDays'),
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <section
            key={card.label}
            className="rounded-2xl border bg-card p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" aria-hidden="true" />
              </div>

              <span className="text-muted-foreground text-xs">{card.hint}</span>
            </div>

            <p className="mt-5 font-bold text-3xl tabular-nums">{card.value}</p>

            <p className="mt-1 font-medium text-muted-foreground text-sm">
              {card.label}
            </p>
          </section>
        );
      })}
    </div>
  );
}

export function StudentOverview({
  assignments,
}: {
  assignments: AssignmentListItem[];
}) {
  const t = useTranslations('Courses.Assignments');

  const gradedAssignments = assignments.filter(
    (assignment) =>
      assignment.submission?.status === 'GRADED' &&
      assignment.submission.score !== null
  );

  const totalEarned = gradedAssignments.reduce(
    (total, assignment) => total + (assignment.submission?.score ?? 0),
    0
  );

  const totalPossible = gradedAssignments.reduce(
    (total, assignment) => total + assignment.maxPoints,
    0
  );

  const currentGrade =
    totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;

  const pendingCount = assignments.filter(
    (assignment) => assignment.submission?.status !== 'GRADED'
  ).length;

  return (
    <section className="flex w-fit overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="min-w-32 px-5 py-3 text-center">
        <p className="font-bold text-primary text-xl tabular-nums">
          {currentGrade}%
        </p>
        <p className="mt-0.5 text-[10px] text-muted-foreground uppercase tracking-[0.16em]">
          {t('currentGrade')}
        </p>
      </div>

      <div className="w-px bg-border" />

      <div className="min-w-32 px-5 py-3 text-center">
        <p className="font-bold text-xl tabular-nums">{pendingCount}</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground uppercase tracking-[0.16em]">
          {t('pendingCount')}
        </p>
      </div>
    </section>
  );
}
