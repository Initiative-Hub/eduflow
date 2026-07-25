'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { AssignmentFilter } from './_components/assignment-list-types';
import {
  getStudentStatus,
  matchesStudentFilter,
} from './_components/assignment-list-types';
import {
  AssignmentsSkeleton,
  EmptyState,
  ErrorState,
} from './_components/assignment-list-states';
import {
  StudentOverview,
  TeacherOverview,
} from './_components/assignment-overview';
import { StudentAssignmentList } from './_components/student-assignment-list';
import { TeacherAssignmentList } from './_components/teacher-assignment-list';
import { useAssignments } from '../../assignments/use-assignment';

export function AssignmentsClient({
  courseId,
  canCreate,
  canGrade,
}: {
  courseId: string;
  canCreate: boolean;
  canGrade: boolean;
}) {
  const t = useTranslations('Courses.Assignments');
  const locale = useLocale();
  const query = useAssignments(courseId);
  const [filter, setFilter] = useState<AssignmentFilter>('all');
  const [search, setSearch] = useState('');
  const [now] = useState(() => Date.now());

  const assignments = query.data ?? [];
  const isTeacher = canGrade;

  const filteredStudentAssignments = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();

    return assignments.filter((assignment) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        assignment.title.toLocaleLowerCase().includes(normalizedSearch);

      return matchesSearch && matchesStudentFilter(assignment, filter);
    });
  }, [assignments, filter, search]);

  const studentFilterCounts = useMemo(
    () => ({
      all: assignments.length,
      pending: assignments.filter(
        (assignment) => getStudentStatus(assignment) !== 'completed'
      ).length,
      completed: assignments.filter(
        (assignment) => getStudentStatus(assignment) === 'completed'
      ).length,
    }),
    [assignments]
  );

  return (
    <div className="relative mx-auto w-full max-w-7xl space-y-7 overflow-hidden pb-14">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.14),transparent_58%)]" />

      <header className="flex flex-col gap-5 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-medium text-primary text-sm uppercase tracking-[0.18em]">
            {isTeacher ? t('teacherEyebrow') : t('studentEyebrow')}
          </p>

          <h1 className="mt-2 font-bold text-3xl tracking-tight md:text-4xl">
            {isTeacher ? t('teacherTitle') : t('title')}
          </h1>

          <p className="mt-2 max-w-2xl text-muted-foreground leading-6">
            {isTeacher ? t('teacherDescription') : t('description')}
          </p>
        </div>

        {canCreate ? (
          <Button asChild>
            <Link href={`/courses/${courseId}/assignments/create`}>
              <Plus data-icon="inline-start" />
              {t('create')}
            </Link>
          </Button>
        ) : null}
      </header>

      {query.isPending ? (
        <AssignmentsSkeleton />
      ) : query.isError ? (
        <ErrorState onRetry={() => query.refetch()} />
      ) : isTeacher ? (
        <>
          <TeacherOverview assignments={assignments} now={now} />

          {assignments.length === 0 ? (
            <EmptyState message={t('noAssignments')} />
          ) : (
            <TeacherAssignmentList
              assignments={assignments}
              courseId={courseId}
              locale={locale}
              now={now}
            />
          )}
        </>
      ) : (
        <>
          <StudentOverview assignments={assignments} />

          <StudentAssignmentList
            assignments={filteredStudentAssignments}
            allAssignmentsCount={assignments.length}
            courseId={courseId}
            locale={locale}
            now={now}
            filter={filter}
            counts={studentFilterCounts}
            search={search}
            onFilterChange={setFilter}
            onSearchChange={setSearch}
          />
        </>
      )}
    </div>
  );
}
