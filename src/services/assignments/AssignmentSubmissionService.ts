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
import { runSerializableAssignmentTransaction } from './assignment-transaction';

type SubmissionFileReference = {
  id: string;
  submissionId: string;
  fileId: string;
};

async function restoreSubmissionFileReference(
  attachment: SubmissionFileReference
) {
  await runSerializableAssignmentTransaction(async (tx) => {
    const draftSubmission = await tx.assignmentSubmission.findFirst({
      where: {
        id: attachment.submissionId,
        status: AssignmentSubmissionStatus.DRAFT,
      },
      select: {
        id: true,
      },
    });

    if (!draftSubmission) {
      return;
    }

    await tx.assignmentSubmissionFile.create({
      data: {
        id: attachment.id,
        submissionId: attachment.submissionId,
        fileId: attachment.fileId,
      },
    });
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

    const attachment = await runSerializableAssignmentTransaction(
      async (tx) => {
        const draftAttachment = await tx.assignmentSubmissionFile.findFirst({
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

        if (!draftAttachment) {
          throw new Error('Submission file not found');
        }

        if (
          draftAttachment.submission.status !== AssignmentSubmissionStatus.DRAFT
        ) {
          throw new Error('Only draft submission files can be removed');
        }

        const removedAttachment = await tx.assignmentSubmissionFile.deleteMany({
          where: {
            id: draftAttachment.id,
            fileId: draftAttachment.fileId,
            submission: {
              is: {
                id: draftAttachment.submissionId,
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

        return draftAttachment;
      }
    );

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

    if (assignment.dueAt && new Date() > assignment.dueAt) {
      throw new Error('The assignment deadline has passed');
    }

    return runSerializableAssignmentTransaction(async (tx) => {
      const submission = await tx.assignmentSubmission.findFirst({
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
                  deletedAt: true,
                  status: true,
                },
              },
            },
          },
        },
      });

      const hasReadyFile = submission?.files.some(
        (entry) =>
          entry.file.status === FileInventoryStatus.READY &&
          entry.file.deletedAt === null
      );

      if (!submission || !hasReadyFile) {
        throw new Error('Upload at least one file before submitting');
      }

      const finalized = await tx.assignmentSubmission.updateMany({
        where: {
          id: submission.id,
          status: AssignmentSubmissionStatus.DRAFT,
          files: {
            some: {
              file: {
                deletedAt: null,
                status: FileInventoryStatus.READY,
              },
            },
          },
        },
        data: {
          status: AssignmentSubmissionStatus.SUBMITTED,
          submittedAt: new Date(),
        },
      });

      if (finalized.count !== 1) {
        throw new Error('Submission changed before it could be finalized');
      }

      return tx.assignmentSubmission.findUniqueOrThrow({
        where: {
          id: submission.id,
        },
      });
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
