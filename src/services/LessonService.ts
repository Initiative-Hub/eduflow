import { prisma } from '@/lib/prisma';
import { checkLessonPermission } from '@/lib/permissions/lesson-permission';

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
    const { lesson, hasEditPermission, hasViewPermission } =
      await checkLessonPermission(lessonId, userId);

    if (!hasViewPermission) {
      throw new Error('Unauthorized: Missing view permission');
    }

    return { ...lesson, canEdit: hasEditPermission };
  }

  static async updateLesson(
    lessonId: string,
    userId: string,
    data: { title?: string; content?: Record<string, unknown> | null }
  ) {
    const { hasEditPermission } = await checkLessonPermission(lessonId, userId);

    if (!hasEditPermission) {
      throw new Error('Unauthorized: Missing EDIT_CONTENT permission');
    }

    return await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        title: data.title !== undefined ? data.title : undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        content: data.content !== undefined ? (data.content as any) : undefined,
      },
    });
  }
}
