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
import { serializeSubmission } from './assignment-projections';

export class AssignmentGradingService {
  static async listSubmissionRoster(assignmentId: string, userId: string) {
    const assignment = await getActiveAssignmentOrThrow(assignmentId);

    await requireCoursePermission(
      userId,
      assignment.courseId,
      COURSE_PERMISSION.ASSESSMENTS_GRADE
    );

    const [studentEnrollments, finalizedSubmissions, publishedResults] =
      await Promise.all([
        prisma.enrollment.findMany({
          where: {
            courseId: assignment.courseId,
            status: CourseEnrollmentStatus.ACTIVE,
            role: {
              name: CourseRoleName.STUDENT,
            },
          },
          orderBy: [
            {
              member: {
                name: 'asc',
              },
            },
            {
              memberId: 'asc',
            },
          ],
          select: {
            member: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        }),

        prisma.assignmentSubmission.findMany({
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
            {
              createdAt: 'desc',
            },
          ],
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

        prisma.assignmentResult.findMany({
          where: {
            assignmentId,
          },
          select: {
            studentId: true,
            sourceSubmissionId: true,
            score: true,
            feedback: true,
            publishedAt: true,
          },
        }),
      ]);

    const latestSubmissionByStudent = new Map<
      string,
      (typeof finalizedSubmissions)[number]
    >();

    for (const submission of finalizedSubmissions) {
      if (!latestSubmissionByStudent.has(submission.studentId)) {
        latestSubmissionByStudent.set(submission.studentId, submission);
      }
    }

    const publishedResultByStudent = new Map(
      publishedResults.map((result) => [result.studentId, result])
    );

    return studentEnrollments.map(({ member }) => {
      const submission = latestSubmissionByStudent.get(member.id);
      const publishedResult = publishedResultByStudent.get(member.id) ?? null;

      return {
        student: member,
        submission: submission ? serializeSubmission(submission) : null,
        publishedResult,
      };
    });
  }

  static async grade(input: {
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

    await requireCoursePermission(
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
}
