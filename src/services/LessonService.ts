import { getCoursePermissions } from '@/lib/permissions/course-permission';
import { COURSE_PERMISSION } from '@/lib/permissions/permission-keys';
import { prisma } from '@/lib/prisma';
import type { TiptapDocument } from '@/utils/lesson-content';

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

  static async getLessonById(lessonId: string, userId: string) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          select: {
            courseId: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new Error('Lesson not found');
    }

    const { containPermission } = await getCoursePermissions(
      userId,
      lesson.module.courseId
    );

    if (!containPermission(COURSE_PERMISSION.COURSE_CONTENT_VIEW)) {
      throw new Error('Unauthorized: Missing COURSE_CONTENT_VIEW permission');
    }

    return {
      ...lesson,
      canEdit: containPermission(COURSE_PERMISSION.COURSE_CONTENT_UPDATE),
    };
  }

  static async updateLesson(
    lessonId: string,
    userId: string,
    data: { title?: string; content?: TiptapDocument }
  ) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          select: {
            courseId: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new Error('Lesson not found');
    }

    const { containPermission } = await getCoursePermissions(
      userId,
      lesson.module.courseId
    );

    if (!containPermission(COURSE_PERMISSION.COURSE_CONTENT_UPDATE)) {
      throw new Error('Unauthorized: Missing COURSE_CONTENT_UPDATE permission');
    }

    return await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        title: data.title,
        content: data.content,
      },
    });
  }
}
