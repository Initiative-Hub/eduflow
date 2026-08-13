import type { AssignmentListItem } from '@/app/[locale]/(dashboard)/courses/[courseId]/assignments/assignment.types';

export type AssignmentFilter = 'all' | 'pending' | 'completed';

export type DueKind = 'none' | 'overdue' | 'today' | 'tomorrow' | 'upcoming';

export function getStudentStatus(
  assignment: AssignmentListItem
): 'notStarted' | 'inProgress' | 'awaitingGrade' | 'completed' {
  if (assignment.submission?.status === 'SUBMITTED') {
    return 'awaitingGrade';
  }

  if (assignment.submission?.status === 'GRADED') {
    return 'completed';
  }

  if (assignment.draftSubmission) {
    return 'inProgress';
  }

  return 'notStarted';
}

export function getDueKind(dueAt: string | null, now: number): DueKind {
  if (!dueAt) {
    return 'none';
  }

  const dueTime = new Date(dueAt).getTime();

  if (!Number.isFinite(dueTime)) {
    return 'none';
  }

  const difference = dueTime - now;
  const oneDay = 24 * 60 * 60 * 1000;

  if (difference <= 0) {
    return 'overdue';
  }

  if (difference <= oneDay) {
    return 'today';
  }

  if (difference <= oneDay * 2) {
    return 'tomorrow';
  }

  return 'upcoming';
}

export function matchesStudentFilter(
  assignment: AssignmentListItem,
  filter: AssignmentFilter
) {
  if (filter === 'all') {
    return true;
  }

  if (filter === 'completed') {
    return assignment.submission?.status === 'GRADED';
  }

  return assignment.submission?.status !== 'GRADED';
}
