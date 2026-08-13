import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AssignmentSubmissionStatus,
  CourseEnrollmentStatus,
  CourseRoleName,
  FileInventoryStatus,
} from '@/generated/prisma';
import { AssignmentSubmissionService } from '@/services/assignments/AssignmentSubmissionService';

const mocks = vi.hoisted(() => ({
  assignment: {
    findFirst: vi.fn(),
  },
  assignmentSubmission: {
    findFirst: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  assignmentSubmissionFile: {
    create: vi.fn(),
    deleteMany: vi.fn(),
    findFirst: vi.fn(),
  },
  enrollment: {
    findFirst: vi.fn(),
  },
  fileInventory: {
    findUniqueOrThrow: vi.fn(),
  },
  storage: {
    confirmUpload: vi.fn(),
    deleteEntries: vi.fn(),
  },
  transaction: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    assignment: mocks.assignment,
    assignmentSubmission: mocks.assignmentSubmission,
    assignmentSubmissionFile: mocks.assignmentSubmissionFile,
    enrollment: mocks.enrollment,
    fileInventory: mocks.fileInventory,
    $transaction: mocks.transaction,
  },
}));

vi.mock('@/services/StorageService', () => ({
  StorageService: mocks.storage,
}));

describe('AssignmentSubmissionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.transaction.mockImplementation(
      async (operation: (tx: unknown) => Promise<unknown>) =>
        operation({
          assignmentSubmission: mocks.assignmentSubmission,
          assignmentSubmissionFile: mocks.assignmentSubmissionFile,
        })
    );

    mocks.assignment.findFirst.mockResolvedValue({
      id: 'assignment-1',
      courseId: 'course-1',
      dueAt: null,
    });
    mocks.enrollment.findFirst.mockResolvedValue({
      courseId: 'course-1',
      memberId: 'student-1',
      status: CourseEnrollmentStatus.ACTIVE,
      role: {
        name: CourseRoleName.STUDENT,
      },
    });
    mocks.assignmentSubmission.findFirst.mockResolvedValue({
      id: 'submission-1',
      status: AssignmentSubmissionStatus.DRAFT,
    });
  });

  it('rejects upload confirmation after the submission is finalized', async () => {
    mocks.assignmentSubmissionFile.findFirst.mockResolvedValue({
      id: 'attachment-1',
      fileId: 'file-1',
      submissionId: 'submission-1',
      submission: {
        status: AssignmentSubmissionStatus.SUBMITTED,
      },
    });

    await expect(
      AssignmentSubmissionService.confirmUpload({
        assignmentId: 'assignment-1',
        userId: 'student-1',
        fileId: 'file-1',
      })
    ).rejects.toThrow('Only draft submission files can be confirmed');

    expect(mocks.storage.confirmUpload).not.toHaveBeenCalled();
  });

  it('restores the draft attachment when storage cleanup fails', async () => {
    mocks.assignmentSubmissionFile.findFirst.mockResolvedValue({
      id: 'attachment-1',
      fileId: 'file-1',
      submissionId: 'submission-1',
      submission: {
        status: AssignmentSubmissionStatus.DRAFT,
      },
    });
    mocks.assignmentSubmissionFile.deleteMany.mockResolvedValue({ count: 1 });
    mocks.assignmentSubmissionFile.create.mockResolvedValue({
      id: 'attachment-1',
    });
    mocks.storage.deleteEntries.mockRejectedValue(
      new Error('Storage unavailable')
    );

    await expect(
      AssignmentSubmissionService.removeDraftFile({
        assignmentId: 'assignment-1',
        userId: 'student-1',
        fileId: 'file-1',
      })
    ).rejects.toThrow('Storage unavailable');

    expect(mocks.assignmentSubmissionFile.create).toHaveBeenCalledWith({
      data: {
        id: 'attachment-1',
        submissionId: 'submission-1',
        fileId: 'file-1',
      },
    });
  });

  it('does not restore a removed attachment after the submission is finalized', async () => {
    mocks.assignmentSubmissionFile.findFirst.mockResolvedValue({
      id: 'attachment-1',
      fileId: 'file-1',
      submissionId: 'submission-1',
      submission: {
        status: AssignmentSubmissionStatus.DRAFT,
      },
    });
    mocks.assignmentSubmissionFile.deleteMany.mockResolvedValue({ count: 1 });
    mocks.storage.deleteEntries.mockRejectedValue(
      new Error('Storage unavailable')
    );
    mocks.assignmentSubmission.findFirst.mockResolvedValue(null);

    await expect(
      AssignmentSubmissionService.removeDraftFile({
        assignmentId: 'assignment-1',
        userId: 'student-1',
        fileId: 'file-1',
      })
    ).rejects.toThrow('Storage unavailable');

    expect(mocks.assignmentSubmissionFile.create).not.toHaveBeenCalled();
  });

  it('refuses to finalize when the ready attachment changes before the state transition', async () => {
    mocks.assignmentSubmission.findFirst.mockResolvedValue({
      id: 'submission-1',
      status: AssignmentSubmissionStatus.DRAFT,
      files: [
        {
          file: {
            deletedAt: null,
            status: FileInventoryStatus.READY,
          },
        },
      ],
    });
    mocks.assignmentSubmission.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      AssignmentSubmissionService.submit('assignment-1', 'student-1')
    ).rejects.toThrow('Submission changed before it could be finalized');

    expect(mocks.assignmentSubmission.findUniqueOrThrow).not.toHaveBeenCalled();
  });
});
