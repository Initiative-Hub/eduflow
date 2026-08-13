import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AssignmentSubmissionStatus,
  CourseEnrollmentStatus,
  CourseRoleName,
  FileInventoryStatus,
} from '@/generated/prisma';
import { COURSE_PERMISSION } from '@/lib/permissions/permission-keys';
import { AssignmentGradingService } from '@/services/assignments/AssignmentGradingService';
import { AssignmentSubmissionService } from '@/services/assignments/AssignmentSubmissionService';

const mocks = vi.hoisted(() => ({
  assignment: {
    findFirst: vi.fn(),
  },
  assignmentSubmission: {
    findMany: vi.fn(),
  },
  assignmentResult: {
    findMany: vi.fn(),
  },
  enrollment: {
    findMany: vi.fn(),
  },
  assignmentSubmissionFile: {
    findFirst: vi.fn(),
  },
  createInventoryReadSignedUrl: vi.fn(),
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
    assignmentSubmissionFile: mocks.assignmentSubmissionFile,
    enrollment: mocks.enrollment,
  },
}));

vi.mock('@/lib/storage/file-storage', () => ({
  createInventoryReadSignedUrl: mocks.createInventoryReadSignedUrl,
}));

function setPermissions(...allowedPermissions: string[]) {
  mocks.getCoursePermissions.mockResolvedValue({
    permissions: allowedPermissions,
    containPermission: (permission: string) =>
      allowedPermissions.includes(permission),
    withoutPermission: (permission: string) =>
      !allowedPermissions.includes(permission),
  });
}

function createAttachment(options: {
  status: AssignmentSubmissionStatus;
  studentId?: string;
}) {
  return {
    fileId: 'file-1',
    submissionId: 'submission-1',
    submission: {
      assignment: {
        courseId: 'course-1',
      },
      assignmentId: 'assignment-1',
      createdAt: new Date('2026-07-25T00:00:00.000Z'),
      feedback: null,
      gradedAt: null,
      gradedById: null,
      id: 'submission-1',
      score: null,
      status: options.status,
      studentId: options.studentId ?? 'student-owner',
      submittedAt: new Date('2026-07-25T00:00:00.000Z'),
      updatedAt: new Date('2026-07-25T00:00:00.000Z'),
    },
    file: {
      deletedAt: null,
      id: 'file-1',
      objectKey: 'users/student-owner/file-1.pdf',
      status: FileInventoryStatus.READY,
    },
  };
}

describe('assignment submission authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assignment.findFirst.mockResolvedValue({
      courseId: 'course-1',
      deletedAt: null,
      id: 'assignment-1',
    });
    mocks.assignmentSubmission.findMany.mockResolvedValue([]);
    mocks.assignmentResult.findMany.mockResolvedValue([]);
    mocks.enrollment.findMany.mockResolvedValue([]);
    mocks.createInventoryReadSignedUrl.mockResolvedValue(
      'https://storage.example.test/file-1'
    );
  });

  it('rejects students listing every submission with results-view permission', async () => {
    setPermissions(COURSE_PERMISSION.ASSESSMENTS_RESULTS_VIEW);

    await expect(
      AssignmentGradingService.listSubmissionRoster(
        'assignment-1',
        'student-viewer'
      )
    ).rejects.toThrow('Forbidden');

    expect(mocks.assignmentSubmission.findMany).not.toHaveBeenCalled();
    expect(mocks.enrollment.findMany).not.toHaveBeenCalled();
  });

  it('allows graders to list the active student roster', async () => {
    setPermissions(COURSE_PERMISSION.ASSESSMENTS_GRADE);

    await expect(
      AssignmentGradingService.listSubmissionRoster('assignment-1', 'teacher-1')
    ).resolves.toEqual([]);

    expect(mocks.enrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          courseId: 'course-1',
          role: {
            name: CourseRoleName.STUDENT,
          },
          status: CourseEnrollmentStatus.ACTIVE,
        },
      })
    );
    expect(mocks.assignmentSubmission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          assignmentId: 'assignment-1',
          status: {
            in: [
              AssignmentSubmissionStatus.SUBMITTED,
              AssignmentSubmissionStatus.GRADED,
            ],
          },
        },
      })
    );
  });

  it('includes students without submissions and keeps only the latest finalized attempt', async () => {
    setPermissions(COURSE_PERMISSION.ASSESSMENTS_GRADE);
    mocks.enrollment.findMany.mockResolvedValue([
      {
        member: {
          email: 'alice@example.com',
          id: 'student-1',
          image: null,
          name: 'Alice',
        },
      },
      {
        member: {
          email: 'bob@example.com',
          id: 'student-2',
          image: null,
          name: 'Bob',
        },
      },
    ]);
    mocks.assignmentSubmission.findMany.mockResolvedValue([
      {
        assignmentId: 'assignment-1',
        createdAt: new Date('2026-07-29T02:00:00.000Z'),
        feedback: null,
        files: [],
        gradedAt: null,
        gradedById: null,
        id: 'submission-new',
        score: null,
        status: AssignmentSubmissionStatus.SUBMITTED,
        studentId: 'student-1',
        submittedAt: new Date('2026-07-29T02:00:00.000Z'),
        updatedAt: new Date('2026-07-29T02:00:00.000Z'),
      },
      {
        assignmentId: 'assignment-1',
        createdAt: new Date('2026-07-28T02:00:00.000Z'),
        feedback: 'Previous feedback',
        files: [],
        gradedAt: new Date('2026-07-28T03:00:00.000Z'),
        gradedById: 'teacher-1',
        id: 'submission-old',
        score: 80,
        status: AssignmentSubmissionStatus.GRADED,
        studentId: 'student-1',
        submittedAt: new Date('2026-07-28T02:00:00.000Z'),
        updatedAt: new Date('2026-07-28T03:00:00.000Z'),
      },
    ]);

    const result = await AssignmentGradingService.listSubmissionRoster(
      'assignment-1',
      'teacher-1'
    );

    expect(result).toEqual([
      {
        student: expect.objectContaining({
          id: 'student-1',
          name: 'Alice',
        }),
        submission: expect.objectContaining({
          id: 'submission-new',
          status: AssignmentSubmissionStatus.SUBMITTED,
        }),
        publishedResult: null,
      },
      {
        student: expect.objectContaining({
          id: 'student-2',
          name: 'Bob',
        }),
        submission: null,
        publishedResult: null,
      },
    ]);
  });

  it('allows students to download their own submission file', async () => {
    setPermissions();
    mocks.assignmentSubmissionFile.findFirst.mockResolvedValue(
      createAttachment({
        status: AssignmentSubmissionStatus.DRAFT,
      })
    );

    await expect(
      AssignmentSubmissionService.createFileDownloadUrl(
        'file-1',
        'student-owner'
      )
    ).resolves.toBe('https://storage.example.test/file-1');
  });

  it('rejects students downloading another student submission file', async () => {
    setPermissions(COURSE_PERMISSION.ASSESSMENTS_RESULTS_VIEW);
    mocks.assignmentSubmissionFile.findFirst.mockResolvedValue(
      createAttachment({
        status: AssignmentSubmissionStatus.SUBMITTED,
      })
    );

    await expect(
      AssignmentSubmissionService.createFileDownloadUrl(
        'file-1',
        'student-viewer'
      )
    ).rejects.toThrow('Forbidden');
  });

  it('allows graders to download finalized submission files', async () => {
    setPermissions(COURSE_PERMISSION.ASSESSMENTS_GRADE);
    mocks.assignmentSubmissionFile.findFirst.mockResolvedValue(
      createAttachment({
        status: AssignmentSubmissionStatus.SUBMITTED,
      })
    );

    await expect(
      AssignmentSubmissionService.createFileDownloadUrl('file-1', 'teacher-1')
    ).resolves.toBe('https://storage.example.test/file-1');
  });

  it('rejects graders downloading draft submission files', async () => {
    setPermissions(COURSE_PERMISSION.ASSESSMENTS_GRADE);
    mocks.assignmentSubmissionFile.findFirst.mockResolvedValue(
      createAttachment({
        status: AssignmentSubmissionStatus.DRAFT,
      })
    );

    await expect(
      AssignmentSubmissionService.createFileDownloadUrl('file-1', 'teacher-1')
    ).rejects.toThrow('Forbidden');
  });
});
