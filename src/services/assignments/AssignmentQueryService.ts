import {
  AssignmentSubmissionStatus,
  CourseEnrollmentStatus,
  CourseRoleName,
} from '@/generated/prisma';
import { COURSE_PERMISSION } from '@/lib/permissions/permission-keys';
import { prisma } from '@/lib/prisma';
import {
  getActiveAssignmentOrThrow,
  requireCoursePermission,
} from './assignment-access';
import {
  normalizeAssignmentContent,
  serializeSubmission,
  toStudentVisibleSubmission,
  toStudentVisibleSubmissionSummary,
} from './assignment-projections';

export class AssignmentQueryService {
  static async list(courseId: string, userId: string) {
    const permissions = await requireCoursePermission(
      userId,
      courseId,
      COURSE_PERMISSION.ASSESSMENTS_VIEW
    );
    const canGrade = permissions.containPermission(
      COURSE_PERMISSION.ASSESSMENTS_GRADE
    );

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
    });

    const finalizedSubmissions = canGrade
      ? await prisma.assignmentSubmission.findMany({
          where: {
            assignmentId: {
              in: assignments.map((assignment) => assignment.id),
            },
            status: {
              in: [
                AssignmentSubmissionStatus.SUBMITTED,
                AssignmentSubmissionStatus.GRADED,
              ],
            },
          },
          orderBy: [
            {
              assignmentId: 'asc',
            },
            {
              studentId: 'asc',
            },
            {
              createdAt: 'desc',
            },
          ],
          select: {
            assignmentId: true,
            studentId: true,
            status: true,
          },
        })
      : [];

    const latestSubmissionByStudent = new Map<
      string,
      (typeof finalizedSubmissions)[number]
    >();

    for (const submission of finalizedSubmissions) {
      const key = `${submission.assignmentId}:${submission.studentId}`;

      if (!latestSubmissionByStudent.has(key)) {
        latestSubmissionByStudent.set(key, submission);
      }
    }

    const submissionSummaryByAssignment = new Map<
      string,
      {
        total: number;
        pending: number;
        graded: number;
      }
    >();

    for (const submission of latestSubmissionByStudent.values()) {
      const current = submissionSummaryByAssignment.get(
        submission.assignmentId
      ) ?? {
        total: 0,
        pending: 0,
        graded: 0,
      };

      current.total += 1;

      if (submission.status === AssignmentSubmissionStatus.SUBMITTED) {
        current.pending += 1;
      }

      if (submission.status === AssignmentSubmissionStatus.GRADED) {
        current.graded += 1;
      }

      submissionSummaryByAssignment.set(submission.assignmentId, current);
    }

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

    const [ownSubmissions, ownPublishedResults] = studentEnrollment
      ? await Promise.all([
          prisma.assignmentSubmission.findMany({
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
            },
          }),
          prisma.assignmentResult.findMany({
            where: {
              studentId: userId,
              assignmentId: {
                in: assignments.map((assignment) => assignment.id),
              },
            },
            select: {
              assignmentId: true,
              score: true,
            },
          }),
        ])
      : [[], []];

    const draftSubmissionMap = new Map<
      string,
      (typeof ownSubmissions)[number]
    >();
    const finalizedSubmissionMap = new Map<
      string,
      (typeof ownSubmissions)[number]
    >();
    const publishedResultMap = new Map(
      ownPublishedResults.map((result) => [result.assignmentId, result])
    );

    for (const submission of ownSubmissions) {
      const submissionMap =
        submission.status === AssignmentSubmissionStatus.DRAFT
          ? draftSubmissionMap
          : finalizedSubmissionMap;

      if (!submissionMap.has(submission.assignmentId)) {
        submissionMap.set(submission.assignmentId, submission);
      }
    }

    return assignments.map((assignment) => {
      const submission = finalizedSubmissionMap.get(assignment.id);
      const publishedResult = publishedResultMap.get(assignment.id);

      return {
        ...assignment,
        content: normalizeAssignmentContent(assignment.content),
        canEdit: permissions.containPermission(
          COURSE_PERMISSION.ASSESSMENTS_UPDATE
        ),
        canDelete: permissions.containPermission(
          COURSE_PERMISSION.ASSESSMENTS_DELETE
        ),
        canGrade,
        submissionSummary: canGrade
          ? (submissionSummaryByAssignment.get(assignment.id) ?? {
              total: 0,
              pending: 0,
              graded: 0,
            })
          : null,
        submission: submission
          ? toStudentVisibleSubmissionSummary(submission, publishedResult)
          : null,
        draftSubmission: draftSubmissionMap.get(assignment.id) ?? null,
      };
    });
  }

  static async getById(assignmentId: string, userId: string) {
    const assignment = await getActiveAssignmentOrThrow(assignmentId);

    const permissions = await requireCoursePermission(
      userId,
      assignment.courseId,
      COURSE_PERMISSION.ASSESSMENTS_VIEW
    );

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

    const [draftSubmission, finalizedSubmission, publishedResult] =
      studentEnrollment
        ? await Promise.all([
            prisma.assignmentSubmission.findFirst({
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
            }),
            prisma.assignmentSubmission.findFirst({
              where: {
                assignmentId,
                studentId: userId,
                status: {
                  in: [
                    AssignmentSubmissionStatus.SUBMITTED,
                    AssignmentSubmissionStatus.GRADED,
                  ],
                },
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
            }),
            prisma.assignmentResult.findUnique({
              where: {
                assignmentId_studentId: {
                  assignmentId,
                  studentId: userId,
                },
              },
              select: {
                score: true,
                feedback: true,
                publishedAt: true,
              },
            }),
          ])
        : [null, null, null];

    return {
      ...assignment,
      content: normalizeAssignmentContent(assignment.content),
      canEdit: permissions.containPermission(
        COURSE_PERMISSION.ASSESSMENTS_UPDATE
      ),
      canDelete: permissions.containPermission(
        COURSE_PERMISSION.ASSESSMENTS_DELETE
      ),
      canGrade: permissions.containPermission(
        COURSE_PERMISSION.ASSESSMENTS_GRADE
      ),
      submission: finalizedSubmission
        ? toStudentVisibleSubmission(finalizedSubmission, publishedResult)
        : null,
      draftSubmission: draftSubmission
        ? serializeSubmission(draftSubmission)
        : null,
    };
  }
}
