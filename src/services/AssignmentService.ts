import {
  AssignmentSubmissionStatus,
  CourseEnrollmentStatus,
  CourseRoleName,
  FileInventoryStatus,
} from '@/generated/prisma';
import { getCoursePermissions } from '@/lib/permissions/course-permission';
import { COURSE_PERMISSION } from '@/lib/permissions/permission-keys';
import { prisma } from '@/lib/prisma';
import { createInventoryReadSignedUrl } from '@/lib/storage/file-storage';
import {
  EMPTY_TIPTAP_DOCUMENT,
  isTiptapDocument,
  type TiptapDocument,
} from '@/utils/lesson-content';
import { StorageService } from './StorageService';

type AssignmentInput = {
  courseId: string;
  userId: string;
  title: string;
  content: TiptapDocument;
  dueAt: Date | null;
  maxPoints: number;
};

function serializeFile<T extends { fileSize: bigint | null }>(file: T) {
  return {
    ...file,
    fileSize: file.fileSize === null ? null : Number(file.fileSize),
  };
}

export class AssignmentService {
  private static async getAssignment(assignmentId: string) {
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        deletedAt: null,
        course: {
          deletedAt: null,
        },
      },
    });

    if (!assignment) {
      throw new Error('Assignment not found');
    }

    return assignment;
  }

  private static async assertPermission(
    userId: string,
    courseId: string,
    permission: string
  ) {
    const permissions = await getCoursePermissions(userId, courseId);

    if (permissions.withoutPermission(permission)) {
      throw new Error('Forbidden');
    }
  }

  private static async assertStudent(assignmentId: string, userId: string) {
    const assignment = await AssignmentService.getAssignment(assignmentId);

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        courseId: assignment.courseId,
        memberId: userId,
        status: CourseEnrollmentStatus.ACTIVE,
        role: {
          name: CourseRoleName.STUDENT,
        },
      },
    });

    if (!enrollment) {
      throw new Error('Only students can submit this assignment');
    }

    return assignment;
  }

  static async listAssignments(courseId: string, userId: string) {
    await AssignmentService.assertPermission(
      userId,
      courseId,
      COURSE_PERMISSION.ASSESSMENTS_VIEW
    );

    const permissions = await getCoursePermissions(userId, courseId);

    const assignments = await prisma.assignment.findMany({
      where: {
        courseId,
        deletedAt: null,
      },
      orderBy: [
        {
          dueAt: 'asc',
        },
        {
          createdAt: 'desc',
        },
      ],
      include: {
        _count: {
          select: {
            submissions: true,
          },
        },
      },
    });

    const studentEnrollment = await prisma.enrollment.findFirst({
      where: {
        courseId,
        memberId: userId,
        status: CourseEnrollmentStatus.ACTIVE,
        role: {
          name: CourseRoleName.STUDENT,
        },
      },
    });

    const ownSubmissions = studentEnrollment
      ? await prisma.assignmentSubmission.findMany({
          where: {
            studentId: userId,
            assignmentId: {
              in: assignments.map((assignment) => assignment.id),
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            assignmentId: true,
            status: true,
            score: true,
          },
        })
      : [];

    const submissionMap = new Map<string, (typeof ownSubmissions)[number]>();

    for (const submission of ownSubmissions) {
      if (!submissionMap.has(submission.assignmentId)) {
        submissionMap.set(submission.assignmentId, submission);
      }
    }

    return assignments.map((assignment) => ({
      ...assignment,
      content: isTiptapDocument(assignment.content)
        ? assignment.content
        : EMPTY_TIPTAP_DOCUMENT,
      canEdit: permissions.containPermission(
        COURSE_PERMISSION.ASSESSMENTS_UPDATE
      ),
      canDelete: permissions.containPermission(
        COURSE_PERMISSION.ASSESSMENTS_DELETE
      ),
      canGrade: permissions.containPermission(
        COURSE_PERMISSION.ASSESSMENTS_GRADE
      ),
      submission: submissionMap.get(assignment.id) ?? null,
    }));
  }

  static async getAssignmentById(assignmentId: string, userId: string) {
    const assignment = await AssignmentService.getAssignment(assignmentId);

    await AssignmentService.assertPermission(
      userId,
      assignment.courseId,
      COURSE_PERMISSION.ASSESSMENTS_VIEW
    );

    const permissions = await getCoursePermissions(userId, assignment.courseId);

    const studentEnrollment = await prisma.enrollment.findFirst({
      where: {
        courseId: assignment.courseId,
        memberId: userId,
        status: CourseEnrollmentStatus.ACTIVE,
        role: {
          name: CourseRoleName.STUDENT,
        },
      },
    });

    const submission = studentEnrollment
      ? await prisma.assignmentSubmission.findFirst({
          where: {
            assignmentId,
            studentId: userId,
          },
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            files: {
              include: {
                file: {
                  select: {
                    id: true,
                    name: true,
                    fileSize: true,
                    mimeType: true,
                    status: true,
                  },
                },
              },
            },
          },
        })
      : null;

    return {
      ...assignment,
      content: isTiptapDocument(assignment.content)
        ? assignment.content
        : EMPTY_TIPTAP_DOCUMENT,
      canEdit: permissions.containPermission(
        COURSE_PERMISSION.ASSESSMENTS_UPDATE
      ),
      canDelete: permissions.containPermission(
        COURSE_PERMISSION.ASSESSMENTS_DELETE
      ),
      canGrade: permissions.containPermission(
        COURSE_PERMISSION.ASSESSMENTS_GRADE
      ),
      submission: submission
        ? {
            ...submission,
            files: submission.files.map((entry) => ({
              ...entry,
              file: serializeFile(entry.file),
            })),
          }
        : null,
    };
  }

  static async createAssignment(input: AssignmentInput) {
    await AssignmentService.assertPermission(
      input.userId,
      input.courseId,
      COURSE_PERMISSION.ASSESSMENTS_CREATE
    );

    if (input.maxPoints <= 0) {
      throw new Error('Maximum points must be greater than zero');
    }

    return prisma.assignment.create({
      data: {
        courseId: input.courseId,
        createdById: input.userId,
        title: input.title.trim(),
        content: input.content,
        dueAt: input.dueAt,
        maxPoints: input.maxPoints,
      },
    });
  }

  static async updateAssignment(
    assignmentId: string,
    userId: string,
    input: {
      title?: string;
      content?: TiptapDocument;
      dueAt?: Date | null;
      maxPoints?: number;
    }
  ) {
    const assignment = await AssignmentService.getAssignment(assignmentId);

    await AssignmentService.assertPermission(
      userId,
      assignment.courseId,
      COURSE_PERMISSION.ASSESSMENTS_UPDATE
    );

    if (input.maxPoints !== undefined && input.maxPoints <= 0) {
      throw new Error('Maximum points must be greater than zero');
    }

    return prisma.assignment.update({
      where: {
        id: assignmentId,
      },
      data: {
        title: input.title?.trim(),
        content: input.content,
        dueAt: input.dueAt,
        maxPoints: input.maxPoints,
      },
    });
  }

  static async deleteAssignment(assignmentId: string, userId: string) {
    const assignment = await AssignmentService.getAssignment(assignmentId);

    await AssignmentService.assertPermission(
      userId,
      assignment.courseId,
      COURSE_PERMISSION.ASSESSMENTS_DELETE
    );

    return prisma.assignment.update({
      where: {
        id: assignmentId,
      },
      data: {
        deletedAt: new Date(),
      },
      select: {
        id: true,
      },
    });
  }

  static async initializeSubmissionUpload(input: {
    assignmentId: string;
    userId: string;
    fileName: string;
    contentType: string;
    fileSize: number;
  }) {
    const assignment = await AssignmentService.assertStudent(
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

      // Submission files stay in the student's private inventory.
      // They are exposed to teachers only through assignment permissions.
      courseId: null,
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

  static async confirmSubmissionUpload(input: {
    assignmentId: string;
    userId: string;
    fileId: string;
  }) {
    await AssignmentService.assertStudent(input.assignmentId, input.userId);

    const attachment = await prisma.assignmentSubmissionFile.findFirst({
      where: {
        fileId: input.fileId,
        submission: {
          assignmentId: input.assignmentId,
          studentId: input.userId,
        },
      },
    });

    if (!attachment) {
      throw new Error('Submission file not found');
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

  static async submitAssignment(assignmentId: string, userId: string) {
    const assignment = await AssignmentService.assertStudent(
      assignmentId,
      userId
    );

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

  static async listSubmissions(assignmentId: string, userId: string) {
    const assignment = await AssignmentService.getAssignment(assignmentId);

    await AssignmentService.assertPermission(
      userId,
      assignment.courseId,
      COURSE_PERMISSION.ASSESSMENTS_RESULTS_VIEW
    );

    const submissions = await prisma.assignmentSubmission.findMany({
      where: {
        assignmentId,
        status: {
          in: [
            AssignmentSubmissionStatus.SUBMITTED,
            AssignmentSubmissionStatus.GRADED,
          ],
        },
      },
      orderBy: [
        {
          studentId: 'asc',
        },
        { createdAt: 'desc' },
      ],
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        files: {
          include: {
            file: {
              select: {
                id: true,
                name: true,
                fileSize: true,
                mimeType: true,
                status: true,
              },
            },
          },
        },
      },
    });

    const latestByStudent = new Map<string, (typeof submissions)[number]>();

    for (const submission of submissions) {
      if (!latestByStudent.has(submission.studentId)) {
        latestByStudent.set(submission.studentId, submission);
      }
    }

    return Array.from(latestByStudent.values()).map((submission) => ({
      ...submission,
      files: submission.files.map((entry) => ({
        ...entry,
        file: serializeFile(entry.file),
      })),
    }));
  }

  static async gradeSubmission(input: {
    submissionId: string;
    userId: string;
    score: number;
    feedback?: string;
  }) {
    const submission = await prisma.assignmentSubmission.findUnique({
      where: {
        id: input.submissionId,
      },
      include: {
        assignment: true,
      },
    });

    if (!submission || submission.assignment.deletedAt) {
      throw new Error('Submission not found');
    }

    await AssignmentService.assertPermission(
      input.userId,
      submission.assignment.courseId,
      COURSE_PERMISSION.ASSESSMENTS_GRADE
    );

    if (input.score < 0 || input.score > submission.assignment.maxPoints) {
      throw new Error('Score is outside the allowed range');
    }

    return prisma.assignmentSubmission.update({
      where: {
        id: input.submissionId,
      },
      data: {
        score: input.score,
        feedback: input.feedback?.trim() || null,
        status: AssignmentSubmissionStatus.GRADED,
        gradedAt: new Date(),
        gradedById: input.userId,
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

    const assignment = attachment.submission.assignment;

    const permissions = await getCoursePermissions(userId, assignment.courseId);

    const isStudentOwner = attachment.submission.studentId === userId;

    if (
      !isStudentOwner &&
      permissions.withoutPermission(COURSE_PERMISSION.ASSESSMENTS_RESULTS_VIEW)
    ) {
      throw new Error('Forbidden');
    }

    return createInventoryReadSignedUrl({
      objectKey: attachment.file.objectKey,
    });
  }
}
