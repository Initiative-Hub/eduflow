import { CoursePermissionKey, CourseRoleName } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';

/**
 * Loads a lesson with its full ownership chain and resolves edit/view
 * permissions for the given user.
 *
 * Extracted from LessonService so the same RBAC logic can be reused
 * by other route handlers (e.g. quiz, attachment routes) without coupling
 * them to LessonService.
 */
export async function checkLessonPermission(lessonId: string, userId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: {
          course: {
            include: {
              enrollments: {
                where: { memberId: userId },
                include: { role: true },
              },
            },
          },
        },
      },
    },
  });

  if (!lesson) {
    throw new Error('Lesson not found');
  }

  const course = lesson.module.course;
  const isTeacher = course.ownerId === userId;
  let hasEditPermission = false;
  let hasViewPermission = false;

  if (!isTeacher && course.enrollments.length > 0) {
    const userRoleId = course.enrollments[0].roleId;

    const editPermissionCheck = await prisma.coursePermission.findFirst({
      where: {
        courseId: course.id,
        courseRoleId: userRoleId,
        permission: CoursePermissionKey.EDIT_CONTENT,
        enabled: true,
      },
    });

    if (
      editPermissionCheck ||
      course.enrollments[0].role.name === CourseRoleName.OWNER ||
      course.enrollments[0].role.name === CourseRoleName.TEACHER
    ) {
      hasEditPermission = true;
    }

    // Any enrolled user has view permission in this project's simplified scope
    hasViewPermission = true;
  } else if (isTeacher) {
    hasEditPermission = true;
    hasViewPermission = true;
  }

  return { lesson, hasEditPermission, hasViewPermission };
}
