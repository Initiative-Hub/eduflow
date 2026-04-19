import { prisma } from '@/lib/prisma';
import { CourseRoleName, CoursePermissionKey } from '@/generated/prisma';

export class LessonService {
  static async createLesson(data: { moduleId: string; title: string }) {
    const lastLesson = await prisma.lesson.findFirst({
      where: { moduleId: data.moduleId },
      orderBy: { orderIndex: 'desc' },
    });

    const newOrderIndex = lastLesson ? lastLesson.orderIndex + 1 : 0;

    return await prisma.lesson.create({
      data: {
        moduleId: data.moduleId,
        title: data.title,
        orderIndex: newOrderIndex,
      },
    });
  }

  static async updateLesson(
    lessonId: string,
    userId: string,
    data: { title?: string; content?: any }
  ) {
    // Fetch lesson with module & course to check permissions
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: {
              include: {
                enrollments: {
                  where: { studentId: userId },
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

    // Check if the user is the course creator (OWNER conceptually)
    const isTeacher = course.teacherId === userId;

    // Or check if the user has an enrollment with a role that has EDIT_CONTENT permission
    let hasEditPermission = false;

    if (!isTeacher && course.enrollments.length > 0) {
      const userRoleId = course.enrollments[0].roleId;

      const permissionCheck = await prisma.coursePermission.findFirst({
        where: {
          courseId: course.id,
          courseRoleId: userRoleId,
          permission: CoursePermissionKey.EDIT_CONTENT,
          enabled: true,
        },
      });

      if (
        permissionCheck ||
        course.enrollments[0].role.name === CourseRoleName.OWNER
      ) {
        hasEditPermission = true;
      }
    }

    if (!isTeacher && !hasEditPermission) {
      throw new Error('Unauthorized: Missing EDIT_CONTENT permission');
    }

    return await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        title: data.title !== undefined ? data.title : undefined,
        content: data.content !== undefined ? data.content : undefined,
      },
    });
  }
}
