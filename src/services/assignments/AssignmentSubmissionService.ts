import {
  AssignmentSubmissionStatus,
  FileInventoryStatus,
} from '@/generated/prisma';
import { COURSE_PERMISSION } from '@/lib/permissions/permission-keys';
import { prisma } from '@/lib/prisma';
import { createInventoryReadSignedUrl } from '@/lib/storage/file-storage';
import { INVENTORY_FOLDER_PATHS } from '@/lib/storage/inventory-folders';
import { StorageService } from '@/services/StorageService';
import {
  requireCoursePermission,
  requireStudentAssignment,
} from './assignment-access';
import { serializeFile } from './assignment-projections';

type SubmissionFileReference = {
  id: string;
  submissionId: string;
  fileId: string;
};

async function restoreSubmissionFileReference(
  attachment: SubmissionFileReference
) {
  await prisma.assignmentSubmissionFile.create({
    data: {
      id: attachment.id,
      submissionId: attachment.submissionId,
      fileId: attachment.fileId,
    },
  });
}

export class AssignmentSubmissionService {
  static async initializeUpload(input: {
    assignmentId: string;
    userId: string;
    fileName: string;
    contentType: string;
    fileSize: number;
  }) {
    const assignment = await requireStudentAssignment(
      input.assignmentId,
      input.userId
    );

    if (assignment.dueAt && new Date() > assignment.dueAt) {
      throw new Error('The assignment deadline has passed');
    }

    const existingDraft = await prisma.assignmentSubmission.findFirst({
      where: {
        assignmentId: input.assignmentId,
        studentId: input.userId,
        status: AssignmentSubmissionStatus.DRAFT,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const submission =
      existingDraft ??
      (await prisma.assignmentSubmission.create({
        data: {
          assignmentId: input.assignmentId,
          studentId: input.userId,
          status: AssignmentSubmissionStatus.DRAFT,
        },
      }));

    const upload = await StorageService.initializeUpload({
      userId: input.userId,

      // Assignment files belong to the student's personal inventory.
      courseId: null,
      folderPath: INVENTORY_FOLDER_PATHS.assignmentSubmission(
        input.assignmentId,
        submission.id
      ),
      fileName: input.fileName,
      contentType: input.contentType,
      fileSize: input.fileSize,
    });

    try {
      await prisma.assignmentSubmissionFile.create({
        data: {
          submissionId: submission.id,
          fileId: upload.id,
        },
      });
    } catch (error) {
      await StorageService.deleteEntries({
        userId: input.userId,
        fileIds: [upload.id],
      });

      throw error;
    }

    return {
      assignmentId: assignment.id,
      submissionId: submission.id,
      fileId: upload.id,
      uploadUrl: upload.uploadUrl,
      uploadHeaders: upload.uploadHeaders,
      name: upload.name,
    };
  }

  static async confirmUpload(input: {
    assignmentId: string;
    userId: string;
    fileId: string;
  }) {
    await requireStudentAssignment(input.assignmentId, input.userId);

    const attachment = await prisma.assignmentSubmissionFile.findFirst({
      where: {
        fileId: input.fileId,
        submission: {
          assignmentId: input.assignmentId,
          studentId: input.userId,
          status: AssignmentSubmissionStatus.DRAFT,
        },
      },
      select: {
        submission: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!attachment) {
      throw new Error('Submission file not found');
    }

    if (attachment.submission.status !== AssignmentSubmissionStatus.DRAFT) {
      throw new Error('Only draft submission files can be confirmed');
    }

    await StorageService.confirmUpload({
      userId: input.userId,
      fileId: input.fileId,
    });

    const file = await prisma.fileInventory.findUniqueOrThrow({
      where: {
        id: input.fileId,
      },
      select: {
        id: true,
        name: true,
        fileSize: true,
        mimeType: true,
        status: true,
      },
    });

    return serializeFile(file);
  }

  static async removeDraftFile(input: {
    assignmentId: string;
    userId: string;
    fileId: string;
  }) {
    await requireStudentAssignment(input.assignmentId, input.userId);

    const attachment = await prisma.assignmentSubmissionFile.findFirst({
      where: {
        fileId: input.fileId,
        submission: {
          assignmentId: input.assignmentId,
          studentId: input.userId,
        },
        file: {
          userId: input.userId,
          deletedAt: null,
        },
      },
      select: {
        id: true,
        fileId: true,
        submissionId: true,
        submission: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!attachment) {
      throw new Error('Submission file not found');
    }

    if (attachment.submission.status !== AssignmentSubmissionStatus.DRAFT) {
      throw new Error('Only draft submission files can be removed');
    }

    const removedAttachment = await prisma.assignmentSubmissionFile.deleteMany({
      where: {
        id: attachment.id,
        fileId: attachment.fileId,
        submission: {
          is: {
            id: attachment.submissionId,
            assignmentId: input.assignmentId,
            studentId: input.userId,
            status: AssignmentSubmissionStatus.DRAFT,
          },
        },
      },
    });

    if (removedAttachment.count !== 1) {
      throw new Error('Only draft submission files can be removed');
    }

    try {
      const deletion = await StorageService.deleteEntries({
        userId: input.userId,
        fileIds: [attachment.fileId],
      });

      if (deletion.deletedCount !== 1) {
        throw new Error('Submission file could not be deleted');
      }
    } catch (error) {
      await restoreSubmissionFileReference(attachment);
      throw error;
    }

    return {
      removedFileId: attachment.fileId,
    };
  }

  static async submit(assignmentId: string, userId: string) {
    const assignment = await requireStudentAssignment(assignmentId, userId);

    const submission = await prisma.assignmentSubmission.findFirst({
      where: {
        assignmentId,
        studentId: userId,
        status: AssignmentSubmissionStatus.DRAFT,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        files: {
          include: {
            file: {
              select: {
                status: true,
              },
            },
          },
        },
      },
    });

    if (!submission) {
      throw new Error('Upload at least one file before submitting');
    }

    const readyFiles = submission.files.filter(
      (entry) => entry.file.status === FileInventoryStatus.READY
    );

    if (readyFiles.length === 0) {
      throw new Error('Upload at least one file before submitting');
    }

    if (assignment.dueAt && new Date() > assignment.dueAt) {
      throw new Error('The assignment deadline has passed');
    }

    return prisma.assignmentSubmission.update({
      where: {
        id: submission.id,
      },
      data: {
        status: AssignmentSubmissionStatus.SUBMITTED,
        submittedAt: new Date(),
      },
    });
  }

  static async createFileDownloadUrl(fileId: string, userId: string) {
    const attachment = await prisma.assignmentSubmissionFile.findFirst({
      where: {
        fileId,
        submission: {
          assignment: {
            deletedAt: null,
          },
        },
      },
      include: {
        submission: {
          include: {
            assignment: {
              select: {
                courseId: true,
              },
            },
          },
        },
        file: {
          select: {
            id: true,
            objectKey: true,
            status: true,
            deletedAt: true,
          },
        },
      },
    });

    if (
      !attachment?.file.objectKey ||
      attachment.file.status !== FileInventoryStatus.READY ||
      attachment.file.deletedAt
    ) {
      throw new Error('File not found');
    }

    const isStudentOwner = attachment.submission.studentId === userId;

    if (!isStudentOwner) {
      if (attachment.submission.status === AssignmentSubmissionStatus.DRAFT) {
        throw new Error('Forbidden');
      }

      await requireCoursePermission(
        userId,
        attachment.submission.assignment.courseId,
        COURSE_PERMISSION.ASSESSMENTS_GRADE
      );
    }

    return createInventoryReadSignedUrl({
      objectKey: attachment.file.objectKey,
    });
  }
}
