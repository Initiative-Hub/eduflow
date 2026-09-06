import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AssignmentSubmissionStatus,
  CourseEnrollmentStatus,
  CourseRoleName,
  FileInventoryStatus,
} from '@/generated/prisma';
import { COURSE_PERMISSION } from '@/lib/permissions/permission-keys';
import { AssignmentQueryService } from '@/services/assignments/AssignmentQueryService';

const mocks = vi.hoisted(() => ({
  assignment: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  assignmentSubmission: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  assignmentResult: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  enrollment: {
    findFirst: vi.fn(),
  },
  getCoursePermissions: vi.fn(),
}));

vi.mock('@/lib/permissions/course-permission', () => ({
  getCoursePermissions: mocks.getCoursePermissions,
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    assignment: mocks.assignment,
    assignmentResult: mocks.assignmentResult,
    assignmentSubmission: mocks.assignmentSubmission,
    enrollment: mocks.enrollment,
  },
}));

const assignment = {
  id: 'assignment-1',
  courseId: 'course-1',
  createdById: 'teacher-1',
  title: 'Assignment 1',
  content: {
    type: 'doc',
    content: [],
  },
  dueAt: new Date('2026-07-31T00:00:00.000Z'),
  maxPoints: 100,
  createdAt: new Date('2026-07-20T00:00:00.000Z'),
  updatedAt: new Date('2026-07-20T00:00:00.000Z'),
  deletedAt: null,
};

function createSubmission(
  id: string,
  status: AssignmentSubmissionStatus,
  createdAt: Date
) {
  return {
    id,
    assignmentId: assignment.id,
    studentId: 'student-1',
    status,
    submittedAt: status === AssignmentSubmissionStatus.DRAFT ? null : createdAt,
    score: status === AssignmentSubmissionStatus.GRADED ? 85 : null,
    feedback: status === AssignmentSubmissionStatus.GRADED ? 'Well done' : null,
    gradedById:
      status === AssignmentSubmissionStatus.GRADED ? 'teacher-1' : null,
    gradedAt: status === AssignmentSubmissionStatus.GRADED ? createdAt : null,
    createdAt,
    updatedAt: createdAt,
    files: [
      {
        id: `${id}-file-link`,
        submissionId: id,
        fileId: `${id}-file`,
        createdAt,
        file: {
          id: `${id}-file`,
          name: `${id}.pdf`,
          fileSize: BigInt(1_024),
          mimeType: 'application/pdf',
          status: FileInventoryStatus.READY,
        },
      },
    ],
  };
}

function setStudentPermissions() {
  mocks.getCoursePermissions.mockResolvedValue({
    permissions: [COURSE_PERMISSION.ASSESSMENTS_VIEW],
    containPermission: (permission: string) =>
      permission === COURSE_PERMISSION.ASSESSMENTS_VIEW,
    withoutPermission: (permission: string) =>
      permission !== COURSE_PERMISSION.ASSESSMENTS_VIEW,
  });
}

describe('AssignmentQueryService student submission state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setStudentPermissions();
    mocks.assignment.findFirst.mockResolvedValue(assignment);
    mocks.assignment.findMany.mockResolvedValue([assignment]);
    mocks.enrollment.findFirst.mockResolvedValue({
      courseId: assignment.courseId,
      memberId: 'student-1',
      status: CourseEnrollmentStatus.ACTIVE,
      role: {
        name: CourseRoleName.STUDENT,
      },
    });
    mocks.assignmentResult.findMany.mockResolvedValue([]);
    mocks.assignmentResult.findUnique.mockResolvedValue(null);
  });

  it('lists the active draft separately from the latest finalized attempt', async () => {
    mocks.assignmentSubmission.findMany.mockResolvedValue([
      {
        id: 'draft-2',
        assignmentId: assignment.id,
        status: AssignmentSubmissionStatus.DRAFT,
        score: null,
      },
      {
        id: 'submission-1',
        assignmentId: assignment.id,
        status: AssignmentSubmissionStatus.GRADED,
        score: 85,
      },
    ]);
    mocks.assignmentResult.findMany.mockResolvedValue([
      {
        assignmentId: assignment.id,
        sourceSubmissionId: 'submission-1',
        score: 85,
      },
    ]);

    const result = await AssignmentQueryService.list(
      assignment.courseId,
      'student-1'
    );

    expect(result[0]).toMatchObject({
      draftSubmission: {
        status: AssignmentSubmissionStatus.DRAFT,
      },
      submission: {
        status: AssignmentSubmissionStatus.GRADED,
        score: 85,
      },
    });
  });

  it('returns the active draft separately from the latest finalized attempt', async () => {
    const draft = createSubmission(
      'draft-2',
      AssignmentSubmissionStatus.DRAFT,
      new Date('2026-07-25T00:00:00.000Z')
    );
    const finalized = createSubmission(
      'submission-1',
      AssignmentSubmissionStatus.GRADED,
      new Date('2026-07-24T00:00:00.000Z')
    );

    mocks.assignmentSubmission.findFirst
      .mockResolvedValueOnce(draft)
      .mockResolvedValueOnce(finalized);
    mocks.assignmentResult.findUnique.mockResolvedValue({
      sourceSubmissionId: finalized.id,
      score: 85,
      feedback: 'Well done',
      publishedAt: new Date('2026-07-24T01:00:00.000Z'),
    });

    const result = await AssignmentQueryService.getById(
      assignment.id,
      'student-1'
    );

    expect(result.draftSubmission).toMatchObject({
      id: draft.id,
      status: AssignmentSubmissionStatus.DRAFT,
    });
    expect(result.submission).toMatchObject({
      id: finalized.id,
      status: AssignmentSubmissionStatus.GRADED,
    });
  });

  it('does not apply a published result to a newer submission in the assignment list', async () => {
    mocks.assignmentSubmission.findMany.mockResolvedValue([
      {
        id: 'submission-new',
        assignmentId: assignment.id,
        status: AssignmentSubmissionStatus.SUBMITTED,
      },
    ]);
    mocks.assignmentResult.findMany.mockResolvedValue([
      {
        assignmentId: assignment.id,
        sourceSubmissionId: 'submission-old',
        score: 85,
      },
    ]);

    const result = await AssignmentQueryService.list(
      assignment.courseId,
      'student-1'
    );

    expect(result[0]?.submission).toEqual({
      id: 'submission-new',
      assignmentId: assignment.id,
      status: AssignmentSubmissionStatus.SUBMITTED,
      score: null,
    });
  });

  it('does not apply a published result to a newer submission in assignment details', async () => {
    const finalized = createSubmission(
      'submission-new',
      AssignmentSubmissionStatus.SUBMITTED,
      new Date('2026-07-25T00:00:00.000Z')
    );

    mocks.assignmentSubmission.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(finalized);
    mocks.assignmentResult.findUnique.mockResolvedValue({
      sourceSubmissionId: 'submission-old',
      score: 85,
      feedback: 'Feedback for the previous attempt',
      publishedAt: new Date('2026-07-24T01:00:00.000Z'),
    });

    const result = await AssignmentQueryService.getById(
      assignment.id,
      'student-1'
    );

    expect(result.submission).toMatchObject({
      id: finalized.id,
      status: AssignmentSubmissionStatus.SUBMITTED,
      score: null,
      feedback: null,
      gradedAt: null,
    });
  });
});
