import { CourseEnrollmentStatus, CourseRoleName } from '@/generated/prisma';
import { getCoursePermissions } from '@/lib/permissions/course-permission';
import { prisma } from '@/lib/prisma';

export async function getActiveAssignmentOrThrow(assignmentId: string) {
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

export async function requireCoursePermission(
  userId: string,
  courseId: string,
  permission: string
) {
  const permissions = await getCoursePermissions(userId, courseId);

  if (permissions.withoutPermission(permission)) {
    throw new Error('Forbidden');
  }

  return permissions;
}

export async function requireStudentAssignment(
  assignmentId: string,
  userId: string
) {
  const assignment = await getActiveAssignmentOrThrow(assignmentId);

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
