import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AssignmentSubmissionStatus,
  CourseEnrollmentStatus,
  CourseRoleName,
} from '@/generated/prisma';
import { AssignmentSubmissionService } from '@/services/assignments/AssignmentSubmissionService';

const mocks = vi.hoisted(() => ({
  assignment: {
    findFirst: vi.fn(),
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
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    assignment: mocks.assignment,
    assignmentSubmissionFile: mocks.assignmentSubmissionFile,
    enrollment: mocks.enrollment,
    fileInventory: mocks.fileInventory,
  },
}));

vi.mock('@/services/StorageService', () => ({
  StorageService: mocks.storage,
}));

describe('AssignmentSubmissionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

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
});
