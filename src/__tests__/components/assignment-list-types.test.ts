import { describe, expect, it } from 'vitest';
import { getStudentStatus } from '@/app/[locale]/(dashboard)/courses/[courseId]/(course-tabs)/assignments/_components/assignment-list-types';
import type { AssignmentListItem } from '@/app/[locale]/(dashboard)/courses/[courseId]/assignments/assignment.service';

describe('getStudentStatus', () => {
  it('shows an active draft as in progress when there is no finalized attempt', () => {
    const assignment = {
      submission: null,
      draftSubmission: {
        status: 'DRAFT',
      },
    } as unknown as AssignmentListItem;

    expect(getStudentStatus(assignment)).toBe('inProgress');
  });

  it('keeps the finalized grade visible while a resubmission draft is active', () => {
    const assignment = {
      submission: {
        status: 'GRADED',
        score: 85,
      },
      draftSubmission: {
        status: 'DRAFT',
      },
    } as unknown as AssignmentListItem;

    expect(getStudentStatus(assignment)).toBe('completed');
  });
});
