import { getCoursePermissions } from '@/lib/permissions/course-permission';
import { COURSE_PERMISSION } from '@/lib/permissions/permission-keys';
import { prisma } from '@/lib/prisma';

export class ModuleService {
  static async createModule(data: { courseId: string; title: string }) {
    // Auto increment orderIndex based on existing modules
    const lastModule = await prisma.module.findFirst({
      where: {
        courseId: data.courseId,
        deletedAt: null,
        course: { deletedAt: null },
      },
      orderBy: { orderIndex: 'desc' },
    });

    const newOrderIndex = lastModule ? lastModule.orderIndex + 1 : 0;

    return await prisma.module.create({
      data: {
        courseId: data.courseId,
        title: data.title,
        orderIndex: newOrderIndex,
      },
    });
  }

  static async getModulesByCourse(courseId: string) {
    return await prisma.module.findMany({
      where: {
        courseId,
        deletedAt: null,
        course: { deletedAt: null },
      },
      orderBy: { orderIndex: 'asc' },
      select: {
        id: true,
        courseId: true,
        title: true,
        orderIndex: true,
        itemLayout: true,
        lessons: {
          where: { deletedAt: null },
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            title: true,
            orderIndex: true,
            // Omit content to keep the payload small for the sidebar
          },
        },
      },
    });
  }

  static async deleteModule(moduleId: string, userId: string) {
    const moduleRecord = await prisma.module.findFirst({
      where: {
        id: moduleId,
        deletedAt: null,
        course: { deletedAt: null },
      },
      select: {
        id: true,
        courseId: true,
      },
    });

    if (!moduleRecord) throw new Error('Module not found');

    const { containPermission } = await getCoursePermissions(
      userId,
      moduleRecord.courseId
    );

    if (!containPermission(COURSE_PERMISSION.COURSE_CONTENT_DELETE)) {
      throw new Error('Unauthorized: Missing COURSE_CONTENT_DELETE permission');
    }

    return prisma.module.update({
      where: { id: moduleId },
      data: { deletedAt: new Date() },
      select: { id: true },
    });
  }
}
