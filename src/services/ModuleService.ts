import { prisma } from '@/lib/prisma';

export class ModuleService {
  static async createModule(data: { courseId: string; title: string }) {
    // Auto increment orderIndex based on existing modules
    const lastModule = await prisma.module.findFirst({
      where: { courseId: data.courseId },
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
      where: { courseId },
      orderBy: { orderIndex: 'asc' },
      select: {
        id: true,
        courseId: true,
        title: true,
        orderIndex: true,
        itemLayout: true,
        lessons: {
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
}
