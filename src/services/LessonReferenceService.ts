import { getCoursePermissions } from '@/lib/permissions/course-permission';
import { COURSE_PERMISSION } from '@/lib/permissions/permission-keys';
import { prisma } from '@/lib/prisma';
import { tiptapDocumentToMarkdown } from '@/lib/tiptap-markdown';
import type { ChatLessonReferenceData } from '@/types/chat-lesson-references';
import { isTiptapDocument } from '@/utils/lesson-content';

export type LessonReferenceModule = {
  id: string;
  title: string;
  lessons: Array<{
    id: string;
    title: string;
  }>;
};

type LessonReferenceRecord = {
  id: string;
  title: string;
  content?: unknown;
  module: {
    title: string;
    course: {
      id: string;
      title: string;
    };
  };
};

function toLessonReferenceSummary(
  lesson: LessonReferenceRecord
): ChatLessonReferenceData {
  return {
    courseId: lesson.module.course.id,
    courseTitle: lesson.module.course.title,
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    moduleTitle: lesson.module.title,
  };
}

export class LessonReferenceService {
  static async listCourseLessonReferences({
    courseId,
    userId,
  }: {
    courseId: string;
    userId: string;
  }): Promise<LessonReferenceModule[]> {
    const { containPermission } = await getCoursePermissions(userId, courseId);

    if (!containPermission(COURSE_PERMISSION.COURSE_CONTENT_VIEW)) {
      throw new Error('Unauthorized: Missing COURSE_CONTENT_VIEW permission');
    }

    return prisma.module.findMany({
      where: {
        courseId,
        deletedAt: null,
        course: { deletedAt: null },
      },
      orderBy: { orderIndex: 'asc' },
      select: {
        id: true,
        title: true,
        lessons: {
          where: { deletedAt: null },
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }

  static async getLessonReferenceSummaries({
    lessonIds,
    userId,
  }: {
    lessonIds: string[];
    userId: string;
  }): Promise<ChatLessonReferenceData[]> {
    const uniqueLessonIds = Array.from(new Set(lessonIds));
    if (uniqueLessonIds.length === 0) return [];

    const lessons = await prisma.lesson.findMany({
      where: {
        id: { in: uniqueLessonIds },
        deletedAt: null,
        module: {
          deletedAt: null,
          course: { deletedAt: null },
        },
      },
      select: {
        id: true,
        title: true,
        module: {
          select: {
            title: true,
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    if (lessons.length !== uniqueLessonIds.length) {
      throw new Error('Lesson reference not found');
    }

    for (const courseId of new Set(
      lessons.map((lesson) => lesson.module.course.id)
    )) {
      const { containPermission } = await getCoursePermissions(
        userId,
        courseId
      );

      if (!containPermission(COURSE_PERMISSION.COURSE_CONTENT_VIEW)) {
        throw new Error('Unauthorized: Missing COURSE_CONTENT_VIEW permission');
      }
    }

    return lessons.map(toLessonReferenceSummary);
  }

  static async getLessonReferencePayloads({
    lessonIds,
    userId,
  }: {
    lessonIds: string[];
    userId: string;
  }): Promise<ChatLessonReferenceData[]> {
    const uniqueLessonIds = Array.from(new Set(lessonIds));
    if (uniqueLessonIds.length === 0) return [];

    const lessons = await prisma.lesson.findMany({
      where: {
        id: { in: uniqueLessonIds },
        deletedAt: null,
        module: {
          deletedAt: null,
          course: { deletedAt: null },
        },
      },
      select: {
        id: true,
        title: true,
        content: true,
        module: {
          select: {
            title: true,
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    if (lessons.length !== uniqueLessonIds.length) {
      throw new Error('Lesson reference not found');
    }

    for (const courseId of new Set(
      lessons.map((lesson) => lesson.module.course.id)
    )) {
      const { containPermission } = await getCoursePermissions(
        userId,
        courseId
      );

      if (!containPermission(COURSE_PERMISSION.COURSE_CONTENT_VIEW)) {
        throw new Error('Unauthorized: Missing COURSE_CONTENT_VIEW permission');
      }
    }

    return lessons.map((lesson) => ({
      ...toLessonReferenceSummary(lesson),
      markdown: isTiptapDocument(lesson.content)
        ? tiptapDocumentToMarkdown(lesson.content)
        : '',
    }));
  }
}
