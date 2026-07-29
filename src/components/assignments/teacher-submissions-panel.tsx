'use client';

import { CheckCircle2, Clock3, Inbox } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import type {
  Assignment,
  TeacherAssignmentStudent,
} from '@/app/[locale]/(dashboard)/courses/[courseId]/assignments/assignment.service';
import {
  useAssignmentSubmissionRoster,
  useGradeSubmission,
} from '@/app/[locale]/(dashboard)/courses/[courseId]/assignments/use-assignment';
import { TeacherSubmissionReview } from '@/components/assignments/teacher-submission-review';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  const rosterQuery = useAssignmentSubmissionRoster(assignment.id);
  const gradeMutation = useGradeSubmission(assignment.id);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null
  );

  if (rosterQuery.isLoading) {
    return <SubmissionsSkeleton />;
  }

  if (rosterQuery.isError) {
    return (
      <section className="rounded-xl border bg-card px-6 py-12 text-center shadow-sm">
        <h2 className="font-semibold text-xl tracking-tight">{t('title')}</h2>
        <p className="mt-2 text-muted-foreground text-sm">{t('loadError')}</p>
      </section>
    );
  }

  const roster = rosterQuery.data ?? [];

  const selectedStudent =
    roster.find((item) => item.student.id === selectedStudentId) ??
    roster.find((item) => item.submission !== null) ??
    roster[0];

  const selectedSubmission = selectedStudent?.submission;
  const summary = roster.reduce(
    (counts, item) => {
      if (!item.submission) {
        counts.notSubmitted += 1;
      } else if (item.submission.status === 'GRADED') {
        counts.graded += 1;
      } else {
        counts.pending += 1;
      }

      return counts;
    },
    {
      notSubmitted: 0,
      pending: 0,
      graded: 0,
    }
  );

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex flex-col gap-4 border-b px-5 py-5 sm:flex-row sm:items-center sm:justify-between md:px-6">
        <div>
          <h2 className="font-semibold text-xl tracking-tight">{t('title')}</h2>
          <p className="mt-1 text-muted-foreground text-sm">
            {t('description', { count: roster.length })}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1.5">
            <Inbox />
            {t('notSubmittedCount', { count: summary.notSubmitted })}
          </Badge>
          <Badge variant="outline" className="gap-1.5">
            <Clock3 />
            {t('pendingCount', { count: summary.pending })}
          </Badge>
          <Badge variant="secondary" className="gap-1.5">
            <CheckCircle2 />
            {t('gradedCount', { count: summary.graded })}
          </Badge>
        </div>
      </div>

      {selectedStudent ? (
        <div className="grid min-h-136 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="border-b bg-muted/20 lg:border-r lg:border-b-0">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <p className="font-semibold text-sm">{t('studentList')}</p>
              <span className="text-muted-foreground text-xs tabular-nums">
                {t('totalCount', { count: roster.length })}
              </span>
            </div>

            <div className="max-h-72 overflow-y-auto p-2 lg:max-h-136">
              {roster.map((item) => {
                const { student, submission } = item;
                const active = student.id === selectedStudent.student.id;

                return (
                  <button
                    key={student.id}
                    type="button"
                    aria-label={t('reviewStudent', { name: student.name })}
                    aria-current={active ? 'true' : undefined}
                    onClick={() => setSelectedStudentId(student.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors',
                      'hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                      active && 'bg-primary/10'
                    )}
                  >
                    <Avatar>
                      <AvatarImage src={student.image ?? undefined} alt="" />
                      <AvatarFallback>
                        {getInitials(student.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-sm">
                        {student.name}
                      </span>
                      <span className="mt-0.5 block truncate text-muted-foreground text-xs">
                        {submission?.submittedAt
                          ? formatSubmissionDate(submission.submittedAt, locale)
                          : t('notSubmitted')}
                      </span>
                    </span>
                    <Badge
                      variant={
                        submission?.status === 'GRADED'
                          ? 'default'
                          : submission
                            ? 'secondary'
                            : 'outline'
                      }
                      className="shrink-0"
                    >
                      {submission
                        ? t(`status${submission.status}`)
                        : t('notSubmitted')}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </aside>

          {selectedSubmission ? (
            <TeacherSubmissionReview
              key={selectedSubmission.id}
              assignment={assignment}
              student={selectedStudent.student}
              submission={selectedSubmission}
              isSaving={gradeMutation.isPending}
              onGrade={(data) =>
                gradeMutation.mutate({
                  submissionId: selectedSubmission.id,
                  ...data,
                })
              }
            />
          ) : (
            <StudentNotSubmittedState student={selectedStudent.student} />
          )}
        </div>
      ) : (
        <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Inbox className="size-5" />
          </span>
          <h3 className="mt-4 font-semibold">{t('noStudents')}</h3>
          <p className="mt-1 max-w-sm text-muted-foreground text-sm">
            {t('noStudentsDescription')}
          </p>
        </div>
      )}
    </section>
  );
}

function StudentNotSubmittedState({
  student,
}: {
  student: TeacherAssignmentStudent;
}) {
  const t = useTranslations('Courses.AssignmentTeacher');

  return (
    <article className="flex min-h-96 flex-col items-center justify-center bg-muted/10 px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Inbox className="size-5" />
      </span>
      <h3 className="mt-4 font-semibold">
        {t('studentNotSubmitted', { name: student.name })}
      </h3>
      <p className="mt-1 max-w-sm text-muted-foreground text-sm">
        {t('studentNotSubmittedDescription')}
      </p>
    </article>
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
