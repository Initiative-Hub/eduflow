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

  private static async checkLessonPermission(lessonId: string, userId: string) {
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
    const isTeacher = course.teacherId === userId;
    let hasEditPermission = false;
    let hasViewPermission = false;

    if (!isTeacher && course.enrollments.length > 0) {
      const userRoleId = course.enrollments[0].roleId;

      // Check edit permissions
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
        hasViewPermission = true;
      }

      // If enrolled, you have view permission automatically for this project's simplified scope
      hasViewPermission = true;
    } else if (isTeacher) {
      hasEditPermission = true;
      hasViewPermission = true;
    }

    return { lesson, hasEditPermission, hasViewPermission };
  }

  static async getLessonById(lessonId: string, userId: string) {
    const { lesson, hasViewPermission } = await this.checkLessonPermission(lessonId, userId);

    if (!hasViewPermission) {
      throw new Error('Unauthorized: Missing view permission');
    }

    return lesson;
  }

  static async updateLesson(
    lessonId: string,
    userId: string,
    data: { title?: string; content?: any }
  ) {
    const { hasEditPermission } = await this.checkLessonPermission(lessonId, userId);

    if (!hasEditPermission) {
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
