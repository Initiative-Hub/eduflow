import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AssignmentSubmissionStatus,
  FileInventoryStatus,
} from '@/generated/prisma';
import { COURSE_PERMISSION } from '@/lib/permissions/permission-keys';
import { AssignmentService } from '@/services/AssignmentService';

const mocks = vi.hoisted(() => ({
  assignment: {
    findFirst: vi.fn(),
  },
  assignmentSubmission: {
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
    assignmentSubmission: mocks.assignmentSubmission,
    assignmentSubmissionFile: mocks.assignmentSubmissionFile,
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

describe('AssignmentService submission authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assignment.findFirst.mockResolvedValue({
      courseId: 'course-1',
      deletedAt: null,
      id: 'assignment-1',
    });
    mocks.assignmentSubmission.findMany.mockResolvedValue([]);
    mocks.createInventoryReadSignedUrl.mockResolvedValue(
      'https://storage.example.test/file-1'
    );
  });

  it('rejects students listing every submission with results-view permission', async () => {
    setPermissions(COURSE_PERMISSION.ASSESSMENTS_RESULTS_VIEW);

    await expect(
      AssignmentService.listSubmissions('assignment-1', 'student-viewer')
    ).rejects.toThrow('Forbidden');

    expect(mocks.assignmentSubmission.findMany).not.toHaveBeenCalled();
  });

  it('allows graders to list finalized submissions', async () => {
    setPermissions(COURSE_PERMISSION.ASSESSMENTS_GRADE);

    await expect(
      AssignmentService.listSubmissions('assignment-1', 'teacher-1')
    ).resolves.toEqual([]);
  });

  it('allows students to download their own submission file', async () => {
    setPermissions();
    mocks.assignmentSubmissionFile.findFirst.mockResolvedValue(
      createAttachment({
        status: AssignmentSubmissionStatus.DRAFT,
      })
    );

    await expect(
      AssignmentService.createFileDownloadUrl('file-1', 'student-owner')
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
      AssignmentService.createFileDownloadUrl('file-1', 'student-viewer')
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
      AssignmentService.createFileDownloadUrl('file-1', 'teacher-1')
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
      AssignmentService.createFileDownloadUrl('file-1', 'teacher-1')
    ).rejects.toThrow('Forbidden');
  });
});
