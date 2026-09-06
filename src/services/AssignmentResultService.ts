import {
  AssignmentSubmissionStatus,
  CourseEnrollmentStatus,
  CourseRoleName,
  Prisma,
} from '@/generated/prisma';
import { getCoursePermissions } from '@/lib/permissions/course-permission';
import { COURSE_PERMISSION } from '@/lib/permissions/permission-keys';
import { prisma } from '@/lib/prisma';

type PublishAssignmentResultsInput = {
  assignmentId: string;
  userId: string;
};

type PublishAssignmentResultsResult = {
  publishedCount: number;
  publishedAt: Date | null;
};

function normalizeFeedback(feedback: string | null): string | null {
  return feedback?.trim() || null;
}

export class AssignmentResultService {
  /**
   * Publishes student-facing results for one assignment.
   *
   * The method creates or updates an `AssignmentResult` snapshot using each
   * active student's latest finalized submission. A result is published only
   * when that latest submission has been graded and has a score.
   *
   * Business rules:
   * - The assignment and its course must not be deleted.
   * - The requesting user must have permission to grade assessments.
   * - Only active students enrolled in the course are considered.
   * - Only the latest `SUBMITTED` or `GRADED` attempt is considered.
   * - The latest attempt must be `GRADED` and contain a score.
   * - Students without a graded submission remain unpublished/"Not graded";
   *   they are not automatically assigned a score of zero.
   * - Existing published results are updated only when the submission, score,
   *   or normalized feedback has changed.
   * - All result changes are performed in one serializable transaction, so a
   *   failure rolls back the complete publish operation.
   */
  static async publish(
    input: PublishAssignmentResultsInput
  ): Promise<PublishAssignmentResultsResult> {
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: input.assignmentId,
        deletedAt: null,
        course: {
          deletedAt: null,
        },
      },
      select: {
        id: true,
        courseId: true,
      },
    });

    if (!assignment) {
      throw new Error('Assignment not found');
    }

    const permissions = await getCoursePermissions(
      input.userId,
      assignment.courseId
    );

    if (permissions.withoutPermission(COURSE_PERMISSION.ASSESSMENTS_GRADE)) {
      throw new Error('Forbidden');
    }

    /*
     * `tx` is the transaction-scoped Prisma client.
     *
     * All database operations inside this callback belong to one transaction.
     * If an operation fails, Prisma rolls back all result changes.
     */
    return prisma.$transaction(
      async (tx) => {
        const enrollment = await tx.enrollment.findMany({
          where: {
            courseId: assignment.courseId,
            status: CourseEnrollmentStatus.ACTIVE,
            role: {
              name: CourseRoleName.STUDENT,
            },
          },
          select: {
            memberId: true,
          },
        });

        const activeStudentIds = enrollment.map(
          (enrollment) => enrollment.memberId
        );

        if (activeStudentIds.length === 0) {
          return {
            publishedCount: 0,
            publishedAt: null,
          };
        }

        const finalizedSubmissions = await tx.assignmentSubmission.findMany({
          where: {
            assignmentId: assignment.id,
            studentId: {
              in: activeStudentIds,
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
              studentId: 'asc',
            },
            {
              createdAt: 'desc',
            },
            {
              id: 'desc',
            },
          ],
          select: {
            id: true,
            studentId: true,
            status: true,
            score: true,
            feedback: true,
          },
        });

        type FinalizedSubmission = (typeof finalizedSubmissions)[number];

        const latestSubmissionByStudent = new Map<
          string,
          FinalizedSubmission
        >();

        for (const submission of finalizedSubmissions) {
          if (!latestSubmissionByStudent.has(submission.studentId)) {
            latestSubmissionByStudent.set(submission.studentId, submission);
          }
        }

        const gradedSubmissions = Array.from(
          latestSubmissionByStudent.values()
        ).filter(
          (submission): submission is FinalizedSubmission & { score: number } =>
            submission.status === AssignmentSubmissionStatus.GRADED &&
            submission.score !== null
        );

        if (gradedSubmissions.length === 0) {
          return {
            publishedCount: 0,
            publishedAt: null,
          };
        }

        const existingResults = await tx.assignmentResult.findMany({
          where: {
            assignmentId: assignment.id,
            studentId: {
              in: gradedSubmissions.map((submission) => submission.studentId),
            },
          },
          select: {
            studentId: true,
            sourceSubmissionId: true,
            score: true,
            feedback: true,
          },
        });

        const resultByStudent = new Map(
          existingResults.map((result) => [result.studentId, result])
        );

        const submissionsToPublish = gradedSubmissions.filter((submission) => {
          const existingResult = resultByStudent.get(submission.studentId);

          if (!existingResult) {
            return true;
          }

          return (
            existingResult.sourceSubmissionId !== submission.id ||
            existingResult.score !== submission.score ||
            normalizeFeedback(existingResult.feedback) !==
              normalizeFeedback(submission.feedback)
          );
        });

        if (submissionsToPublish.length === 0) {
          return {
            publishedCount: 0,
            publishedAt: null,
          };
        }

        const publishedAt = new Date();

        for (const submission of submissionsToPublish) {
          await tx.assignmentResult.upsert({
            where: {
              assignmentId_studentId: {
                assignmentId: assignment.id,
                studentId: submission.studentId,
              },
            },
            create: {
              assignmentId: assignment.id,
              studentId: submission.studentId,
              sourceSubmissionId: submission.id,
              publishedById: input.userId,
              score: submission.score,
              feedback: normalizeFeedback(submission.feedback),
              publishedAt,
            },
            update: {
              sourceSubmissionId: submission.id,
              publishedById: input.userId,
              score: submission.score,
              feedback: normalizeFeedback(submission.feedback),
              publishedAt,
            },
          });
        }

        return {
          publishedCount: submissionsToPublish.length,
          publishedAt,
        };
      },
      {
        maxWait: 5_000,
        timeout: 20_000,
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );
  }
}
