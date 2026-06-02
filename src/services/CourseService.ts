import { CourseRoleName } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import type { AICourseGeneration } from '@/lib/validations/course.schema';
import { ChatProviderFactory } from '@/services/ai/ChatProviderFactory';
import { OpenRouterService } from '@/services/ai/OpenRouterService';
import { StorageService } from '@/services/StorageService';
export class CourseService {
  static async assertCourseOwner(courseId: string, userId: string) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { ownerId: true },
    });

    if (!course) {
      throw new Error('Course not found');
    }

    if (course.ownerId !== userId) {
      throw new Error('Forbidden');
    }

    return course;
  }

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

  static async isMember(courseId: string, userId: string) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { ownerId: true },
    });

    if (!course) return false;
    if (course.ownerId === userId) return true;

    const enrollment = await prisma.enrollment.findFirst({
      where: { courseId, memberId: userId },
    });

    return !!enrollment;
  }

  static async listFiles(options: {
    courseId: string;
    userId: string;
    parentId?: string | null;
    search?: string;
    limit: number;
    offset: number;
  }) {
    if (!(await CourseService.isMember(options.courseId, options.userId))) {
      throw new Error('Unauthorized');
    }

    return await StorageService.listDirectory({
      userId: options.userId,
      courseId: options.courseId,
      parentId: options.parentId,
      search: options.search,
      limit: options.limit,
      offset: options.offset,
    });
  }

  static async getAnalytics(courseId: string, userId: string) {
    if (!(await CourseService.isMember(courseId, userId))) {
      throw new Error('Unauthorized');
    }

    return await StorageService.getAnalytics({
      userId,
      courseId,
    });
  }

  static async createFolder(options: {
    courseId: string;
    userId: string;
    parentId?: string | null;
    name: string;
  }) {
    if (!(await CourseService.isMember(options.courseId, options.userId))) {
      throw new Error('Unauthorized');
    }

    return await StorageService.createFolder({
      userId: options.userId,
      courseId: options.courseId,
      parentId: options.parentId,
      name: options.name,
    });
  }

  static async initializeUpload(options: {
    courseId: string;
    userId: string;
    parentId?: string | null;
    fileName: string;
    contentType: string;
    fileSize: number;
  }) {
    if (!(await CourseService.isMember(options.courseId, options.userId))) {
      throw new Error('Unauthorized');
    }

    return await StorageService.initializeUpload({
      userId: options.userId,
      courseId: options.courseId,
      parentId: options.parentId,
      fileName: options.fileName,
      contentType: options.contentType,
      fileSize: options.fileSize,
    });
  }

  static async confirmUpload(courseId: string, userId: string, fileId: string) {
    if (!(await CourseService.isMember(courseId, userId))) {
      throw new Error('Unauthorized');
    }

    // We still need to check if the file belongs to the course
    const file = await prisma.fileInventory.findUnique({
      where: { id: fileId },
      select: { courseId: true },
    });

    if (!file || file.courseId !== courseId) {
      throw new Error('File not found in this course');
    }

    return await StorageService.confirmUpload({
      userId,
      fileId,
    });
  }

  static async deleteFiles(
    courseId: string,
    userId: string,
    fileIds: string[]
  ) {
    if (!(await CourseService.isMember(courseId, userId))) {
      throw new Error('Unauthorized');
    }

    // Verify all files belong to the course
    const files = await prisma.fileInventory.findMany({
      where: { id: { in: fileIds } },
      select: { courseId: true },
    });

    if (files.some((f) => f.courseId !== courseId)) {
      throw new Error('Some files do not belong to this course');
    }

    return await StorageService.deleteEntries({
      userId,
      fileIds,
    });
  }

  static async updateEntry(options: {
    courseId: string;
    userId: string;
    fileId: string;
    name?: string;
    parentId?: string | null;
  }) {
    if (!(await CourseService.isMember(options.courseId, options.userId))) {
      throw new Error('Unauthorized');
    }

    const file = await prisma.fileInventory.findUnique({
      where: { id: options.fileId },
      select: { courseId: true },
    });

    if (!file || file.courseId !== options.courseId) {
      throw new Error('File not found in this course');
    }

    return await StorageService.updateEntry({
      userId: options.userId,
      fileId: options.fileId,
      name: options.name,
      parentId: options.parentId,
    });
  }

  static async createShareUrl(
    courseId: string,
    userId: string,
    fileId: string
  ) {
    if (!(await CourseService.isMember(courseId, userId))) {
      throw new Error('Unauthorized');
    }

    const file = await prisma.fileInventory.findUnique({
      where: { id: fileId },
      select: { courseId: true },
    });

    if (!file || file.courseId !== courseId) {
      throw new Error('File not found in this course');
    }

    return await StorageService.createShareUrl({
      userId,
      fileId,
    });
  }

  static async createShareUrlsBatch(
    courseId: string,
    userId: string,
    fileIds: string[],
    expiresInSeconds?: number
  ) {
    if (!(await CourseService.isMember(courseId, userId))) {
      throw new Error('Unauthorized');
    }

    const files = await prisma.fileInventory.findMany({
      where: { id: { in: fileIds } },
      select: { courseId: true },
    });

    if (files.some((f) => f.courseId !== courseId)) {
      throw new Error('Some files do not belong to this course');
    }

    return await StorageService.createShareUrlsBatch({
      userId,
      fileIds,
      expiresInSeconds,
    });
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
    const aiService = ChatProviderFactory.create('ai-gateway');
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

  /**
   * Returns a ReadableStream<string> that emits NDJSON lines for each pipeline phase:
   *   {"type":"extract"} → {"type":"search"} → {"type":"generate","delta":"..."} × N
   *   → {"type":"save"} → {"type":"done"}
   */
  static generateModulesStream(data: {
    userId: string;
    courseId: string;
    fileId?: string;
    file?: File;
    apiKey?: string;
    context?: string;
  }): ReadableStream<string> {
    const { readable, writable } = new TransformStream<string, string>();
    const writer = writable.getWriter();

    (async () => {
      try {
        const aiService = new OpenRouterService();

        // Runs extract → search → generate deltas → done, persists via onFinish
        await aiService.streamCourseToWriter(
          {
            userId: data.userId,
            fileId: data.fileId,
            file: data.file,
            apiKey: data.apiKey,
            context: data.context,
            onFinish: async ({ object }) => {
              if (!object) return;
              // Emit save event before persisting
              await writer.write(JSON.stringify({ type: 'save' }) + '\n');
              await CourseService.saveGeneratedCourseData(
                data.courseId,
                object as AICourseGeneration
              );
            },
          },
          writer
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        await writer.write(JSON.stringify({ type: 'error', message }) + '\n');
      } finally {
        await writer.close();
      }
    })();

    return readable;
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
          const lessonData = mod.lessons.map(
            (lesson: { lessonTitle?: string; content?: string }) => ({
              moduleId: createdModule.id,
              title: lesson.lessonTitle || 'Untitled Lesson',
              content: lesson.content || '',
              orderIndex: currentLessonOrder++,
            })
          );

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
