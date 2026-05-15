import { CourseRoleName } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import type { AICourseGeneration } from '@/lib/validations/course.schema';
import { ChatProviderFactory } from '@/services/ai/ChatProviderFactory';

export class CourseService {
  static async createCourse(data: {
    ownerId: string;
    title: string;
    description?: string;
  }) {
    // We create the course and also assign the creator as the OWNER in CourseRole
    return await prisma.$transaction(async (tx) => {
      // Create the course
      const course = await tx.course.create({
        data: {
          ownerId: data.ownerId,
          title: data.title,
          description: data.description,
        },
      });

      // Get or create the OWNER role
      let ownerRole = await tx.courseRole.findUnique({
        where: { name: CourseRoleName.OWNER },
      });

      if (!ownerRole) {
        ownerRole = await tx.courseRole.create({
          data: { name: CourseRoleName.OWNER },
        });
      }

      // Add enrollment for the creator as OWNER
      await tx.enrollment.create({
        data: {
          memberId: data.ownerId,
          courseId: course.id,
          roleId: ownerRole.id,
        },
      });

      return course;
    });
  }

  static async getCoursesByOwner(ownerId: string) {
    return await prisma.course.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { modules: true, enrollments: true },
        },
      },
    });
  }

  static async getCourseById(courseId: string, userId: string) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    const member = await prisma.enrollment.findFirst({
      where: {
        courseId,
        memberId: userId,
      },
    });

    if (!course) {
      throw new Error('Course not found');
    }

    if (!member && course.ownerId !== userId) {
      throw new Error('Unauthorized');
    }

    return course;
  }

  static async togglePublish(
    courseId: string,
    isPublished: boolean,
    ownerId: string
  ) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new Error('Course not found');
    }

    if (course.ownerId !== ownerId) {
      throw new Error('Unauthorized');
    }

    return await prisma.course.update({
      where: { id: courseId },
      data: { isPublished },
    });
  }

  static async generateModulesFromAI(data: {
    userId: string;
    courseId: string;
    fileId?: string;
    file?: File;
    apiKey?: string;
    context?: string;
  }) {
    const aiService = ChatProviderFactory.create('openrouter');
    const result = await aiService.streamCourse({
      userId: data.userId,
      fileId: data.fileId,
      file: data.file,
      apiKey: data.apiKey,
      context: data.context,
      onFinish: async ({ object }) => {
        if (!object) {
          throw new Error('AI course generation did not return a valid object');
        }

        await CourseService.saveGeneratedCourseData(
          data.courseId,
          object as AICourseGeneration
        );
      },
    });

    return result;
  }

  static async saveGeneratedCourseData(
    courseId: string,
    data: AICourseGeneration
  ) {
    if (!data.modules || !Array.isArray(data.modules)) return;

    // Get the current max order index for the modules of this course
    const lastModule = await prisma.module.findFirst({
      where: { courseId },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });

    let currentModuleOrder = lastModule ? lastModule.orderIndex + 1 : 0;

    await prisma.$transaction(async (tx) => {
      for (const mod of data.modules) {
        // Create the module
        const createdModule = await tx.module.create({
          data: {
            courseId,
            title: mod.title || 'Untitled Module',
            orderIndex: currentModuleOrder++,
          },
        });

        if (mod.lessons && Array.isArray(mod.lessons)) {
          let currentLessonOrder = 0;
          const lessonData = mod.lessons.map((lesson) => ({
            moduleId: createdModule.id,
            title: lesson.lessonTitle || 'Untitled Lesson',
            content: lesson.content || '',
            orderIndex: currentLessonOrder++,
          }));

          if (lessonData.length > 0) {
            await tx.lesson.createMany({
              data: lessonData,
            });
          }
        }
      }
    });
  }
}
