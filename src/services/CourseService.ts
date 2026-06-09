import { CourseRoleName } from '@/generated/prisma';
import {
  COURSE_PERMISSION,
  COURSE_PERMISSION_KEYS,
  type CoursePermissionKey,
} from '@/lib/permissions/permission-keys';
import { prisma } from '@/lib/prisma';
import { htmlToTiptapDocument } from '@/lib/tiptap-html';
import type { AICourseGeneration } from '@/lib/validations/course.schema';
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
    // We create the course and also assign the creator as the COURSE_OWNER in CourseRole
    return await prisma.$transaction(async (tx) => {
      // Create the course
      const course = await tx.course.create({
        data: {
          ownerId: data.ownerId,
          title: data.title,
          description: data.description,
        },
      });

      // Get or create course roles
      let courseOwnerRole = await tx.courseRole.findUnique({
        where: { name: CourseRoleName.COURSE_OWNER },
      });
      let teacherRole = await tx.courseRole.findUnique({
        where: { name: CourseRoleName.TEACHER },
      });
      let studentRole = await tx.courseRole.findUnique({
        where: { name: CourseRoleName.STUDENT },
      });

      if (!courseOwnerRole) {
        courseOwnerRole = await tx.courseRole.create({
          data: { name: CourseRoleName.COURSE_OWNER },
        });
      }
      if (!teacherRole) {
        teacherRole = await tx.courseRole.create({
          data: { name: CourseRoleName.TEACHER },
        });
      }
      if (!studentRole) {
        studentRole = await tx.courseRole.create({
          data: { name: CourseRoleName.STUDENT },
        });
      }

      // Add enrollment for the creator as COURSE_OWNER
      await tx.enrollment.create({
        data: {
          memberId: data.ownerId,
          courseId: course.id,
          roleId: courseOwnerRole.id,
        },
      });

      const courseRolePermissionDefaults: Record<
        CourseRoleName,
        CoursePermissionKey[]
      > = {
        COURSE_OWNER: COURSE_PERMISSION_KEYS,
        TEACHER: [
          COURSE_PERMISSION.COURSE_MEMBERS_VIEW,
          COURSE_PERMISSION.COURSE_CONTENT_VIEW,
          COURSE_PERMISSION.COURSE_CONTENT_CREATE,
          COURSE_PERMISSION.COURSE_CONTENT_UPDATE,
          COURSE_PERMISSION.ASSESSMENTS_VIEW,
          COURSE_PERMISSION.ASSESSMENTS_CREATE,
          COURSE_PERMISSION.ASSESSMENTS_UPDATE,
          COURSE_PERMISSION.ASSESSMENTS_RESULTS_VIEW,
          COURSE_PERMISSION.ASSESSMENTS_GRADE,
          COURSE_PERMISSION.COURSE_FILES_VIEW,
          COURSE_PERMISSION.COURSE_FILES_MANAGE,
          COURSE_PERMISSION.AI_USE_COURSE_GENERATION,
          COURSE_PERMISSION.COURSE_ANALYTICS_VIEW,
        ],
        STUDENT: [
          COURSE_PERMISSION.COURSE_CONTENT_VIEW,
          COURSE_PERMISSION.ASSESSMENTS_VIEW,
          COURSE_PERMISSION.ASSESSMENTS_RESULTS_VIEW,
          COURSE_PERMISSION.COURSE_FILES_VIEW,
        ],
      };

      const roleMap = {
        [CourseRoleName.COURSE_OWNER]: courseOwnerRole.id,
        [CourseRoleName.TEACHER]: teacherRole.id,
        [CourseRoleName.STUDENT]: studentRole.id,
      };

      await tx.coursePermission.createMany({
        data: [
          CourseRoleName.COURSE_OWNER,
          CourseRoleName.TEACHER,
          CourseRoleName.STUDENT,
        ].flatMap((roleName) => {
          const enabledSet = new Set(courseRolePermissionDefaults[roleName]);

          return COURSE_PERMISSION_KEYS.map((permission) => ({
            courseId: course.id,
            courseRoleId: roleMap[roleName],
            permission,
            enabled: enabledSet.has(permission),
          }));
        }),
        skipDuplicates: true,
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
    context?: string;
    apiKey?: string;
    model?: string;
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
            context: data.context,
            apiKey: data.apiKey,
            model: data.model,
            onFinish: async ({ object }) => {
              if (!object) return;
              // Emit save event before persisting
              await writer.write(`${JSON.stringify({ type: 'save' })}\n`);
              await CourseService.saveGeneratedCourseData(
                data.courseId,
                object
              );
            },
          },
          writer
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.log('Error in course generation stream:', message);
        await writer.write(`${JSON.stringify({ type: 'error', message })}\n`);
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
          const lessonData = mod.lessons.map((lesson) => ({
            moduleId: createdModule.id,
            title: lesson.lessonTitle || 'Untitled Lesson',
            content: htmlToTiptapDocument(lesson.content || ''),
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
