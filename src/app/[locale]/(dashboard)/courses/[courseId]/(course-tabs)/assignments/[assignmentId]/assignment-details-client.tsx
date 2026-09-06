'use client';

import { ArrowLeft, CalendarDays, Clock3, Star } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { AssignmentEditor } from '@/components/assignments/assignment-editor';
import { StudentSubmissionPanel } from '@/components/assignments/student-submission-panel';
import { TeacherSubmissionsPanel } from '@/components/assignments/teacher-submissions-panel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useAssignment,
  useUpdateAssignment,
} from '../../../assignments/use-assignment';

export function AssignmentDetailsClient({
  courseId,
  assignmentId,
}: {
  courseId: string;
  assignmentId: string;
}) {
  const t = useTranslations('Courses.AssignmentDetails');
  const locale = useLocale();
  const assignmentQuery = useAssignment(assignmentId);
  const updateMutation = useUpdateAssignment(courseId);

  if (assignmentQuery.isLoading) {
    return <AssignmentDetailsSkeleton />;
  }

  const assignment = assignmentQuery.data;

  if (!assignment) {
    return (
      <p className="py-16 text-center text-muted-foreground">{t('notFound')}</p>
    );
  }

  const formattedDueDate = assignment.dueAt
    ? new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(assignment.dueAt))
    : t('noDeadline');

  const editor = (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <AssignmentEditor
        title={assignment.title}
        content={assignment.content}
        canEdit={assignment.canEdit}
        appearance="embedded"
        headerTitle={t('briefTitle')}
        headerDescription={t('briefDescription')}
        showAssignmentSettings={assignment.canEdit}
        dueAt={assignment.dueAt}
        maxPoints={assignment.maxPoints}
        isSaving={updateMutation.isPending}
        showActions={assignment.canEdit}
        onSave={(data, options) => {
          updateMutation.mutate(
            {
              assignmentId: assignment.id,
              title: data.title,
              content: data.content,
              dueAt: data.dueAt,
              maxPoints: data.maxPoints,
            },
            {
              onSuccess: options.onSuccess,
            }
          );
        }}
      />
    </section>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      <header className="flex items-start gap-4">
        <Button variant="outline" size="icon" className="mt-1" asChild>
          <Link
            href={`/courses/${courseId}/assignments`}
            aria-label={t('back')}
          >
            <ArrowLeft />
          </Link>
        </Button>

        <div className="min-w-0 flex-1">
          <p className="font-medium text-primary text-sm tracking-wide">
            {assignment.canGrade ? t('teacherEyebrow') : t('studentEyebrow')}
          </p>
          <h1 className="mt-1 font-bold text-3xl tracking-tight md:text-4xl">
            {assignment.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-muted-foreground text-sm">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4" />
              {t('due', { date: formattedDueDate })}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Star className="size-4" />
              {t('points', { points: assignment.maxPoints })}
            </span>
          </div>
        </div>
      </header>

      {!assignment.canGrade && assignment.dueAt ? (
        <DeadlineBanner dueAt={assignment.dueAt} />
      ) : null}

      {assignment.canGrade ? (
        <div className="space-y-6">
          <TeacherSubmissionsPanel assignment={assignment} />
          {editor}
        </div>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          {editor}
          <aside className="lg:sticky lg:top-20">
            <StudentSubmissionPanel assignment={assignment} />
          </aside>
        </div>
      )}
    </div>
  );
}

function DeadlineBanner({ dueAt }: { dueAt: string }) {
  const t = useTranslations('Courses.AssignmentDetails');
  const difference = new Date(dueAt).getTime() - Date.now();
  const totalHours = Math.max(0, Math.floor(difference / (1000 * 60 * 60)));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const overdue = difference <= 0;

  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-card px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Clock3 className="size-4" />
        </span>
        <div>
          <p className="font-medium text-sm">{t('timeRemaining')}</p>
          <p className="mt-0.5 text-muted-foreground text-xs">
            {t('timeRemainingDescription')}
          </p>
        </div>
      </div>
      <p className="font-bold text-primary text-xl tabular-nums">
        {overdue ? t('overdue') : t('remaining', { days, hours })}
      </p>
    </section>
  );
}

function AssignmentDetailsSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      <div className="flex gap-4">
        <Skeleton className="size-9" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-10 w-96 max-w-full" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
      </div>
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Skeleton className="h-[32rem] rounded-xl" />
        <Skeleton className="h-[26rem] rounded-xl" />
      </div>
    </div>
  );
}
