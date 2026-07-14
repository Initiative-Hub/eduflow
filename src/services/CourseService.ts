import { randomUUID } from 'node:crypto';
import { after } from 'next/server';
import {
  CourseEnrollmentStatus,
  CourseInvitationStatus,
  CourseRoleName,
} from '@/generated/prisma';
import { getCoursePermissions } from '@/lib/permissions/course-permission';
import {
  COURSE_PERMISSION,
  COURSE_PERMISSION_KEYS,
  type CoursePermissionKey,
} from '@/lib/permissions/permission-keys';
import { prisma } from '@/lib/prisma';
import { htmlToTiptapDocument } from '@/lib/tiptap-html';
import type { AICourseGeneration } from '@/lib/validations/course.schema';
import { OpenRouterService } from '@/services/ai/OpenRouterService';
import { LessonContentEmbeddingService } from '@/services/LessonContentEmbeddingService';
import { StorageService } from '@/services/StorageService';
import type { TiptapDocument } from '@/utils/lesson-content';

export type CourseListSort =
  | 'updated-desc'
  | 'created-desc'
  | 'title-asc'
  | 'members-desc';

export type CourseListParams = {
  ownedOnly: boolean;
  page: number;
  pageSize: number;
  publicOnly: boolean;
  search: string;
  sort: CourseListSort;
};

function scheduleLessonContentIndexing(lessonId: string) {
  const run = async () => {
    try {
      await LessonContentEmbeddingService.indexLessonContent(lessonId);
    } catch (error) {
      console.error('Lesson content indexing failed:', error);
    }
  };

  try {
    after(run);
  } catch {
    void run();
  }
}

export class CourseService {
  static async assertCourseOwner(courseId: string, userId: string) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { deletedAt: true, ownerId: true },
    });

    if (!course || course.deletedAt) {
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
          COURSE_PERMISSION.COURSE_ROLES_MANAGE,
          COURSE_PERMISSION.COURSE_CONTENT_VIEW,
          COURSE_PERMISSION.COURSE_CONTENT_CREATE,
          COURSE_PERMISSION.COURSE_CONTENT_UPDATE,
          COURSE_PERMISSION.COURSE_FILES_VIEW,
          COURSE_PERMISSION.COURSE_FILES_MANAGE,
          COURSE_PERMISSION.COURSE_ANALYTICS_VIEW,
          COURSE_PERMISSION.AI_USE_COURSE_GENERATION,
          COURSE_PERMISSION.ASSESSMENTS_VIEW,
          COURSE_PERMISSION.ASSESSMENTS_CREATE,
          COURSE_PERMISSION.ASSESSMENTS_UPDATE,
          COURSE_PERMISSION.ASSESSMENTS_RESULTS_VIEW,
          COURSE_PERMISSION.ASSESSMENTS_GRADE,
        ],
        STUDENT: [
          COURSE_PERMISSION.COURSE_CONTENT_VIEW,
          COURSE_PERMISSION.COURSE_FILES_VIEW,
          COURSE_PERMISSION.ASSESSMENTS_VIEW,
          COURSE_PERMISSION.ASSESSMENTS_RESULTS_VIEW,
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

  static async getJoinedCourses(userId: string) {
    return await prisma.course.findMany({
      where: {
        deletedAt: null,
        OR: [
          { ownerId: userId },
          {
            enrollments: {
              some: {
                memberId: userId,
                status: CourseEnrollmentStatus.ACTIVE,
              },
            },
          },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: {
            modules: { where: { deletedAt: null } },
            enrollments: {
              where: {
                status: CourseEnrollmentStatus.ACTIVE,
              },
            },
          },
        },
      },
    });
  }

  static async listAccessibleCourses(userId: string, params: CourseListParams) {
    const page = Math.max(1, params.page);
    const pageSize = Math.min(Math.max(1, params.pageSize), 100);
    const search = params.search.trim();
    const accessWhere = params.ownedOnly
      ? { ownerId: userId }
      : {
          OR: [
            { ownerId: userId },
            {
              enrollments: {
                some: {
                  memberId: userId,
                  status: {
                    in: [
                      CourseEnrollmentStatus.ACTIVE,
                      CourseEnrollmentStatus.PENDING_INVITE,
                    ],
                  },
                },
              },
            },
          ],
        };

    const where = {
      AND: [
        { deletedAt: null },
        accessWhere,
        ...(params.publicOnly ? [{ isPublished: true }] : []),
        ...(search
          ? [
              {
                OR: [
                  { title: { contains: search, mode: 'insensitive' as const } },
                  {
                    description: {
                      contains: search,
                      mode: 'insensitive' as const,
                    },
                  },
                ],
              },
            ]
          : []),
      ],
    };

    const orderBy =
      params.sort === 'created-desc'
        ? { createdAt: 'desc' as const }
        : params.sort === 'title-asc'
          ? { title: 'asc' as const }
          : params.sort === 'members-desc'
            ? { enrollments: { _count: 'desc' as const } }
            : { updatedAt: 'desc' as const };

    const [total, courses] = await Promise.all([
      prisma.course.count({ where }),
      prisma.course.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          ownerId: true,
          title: true,
          description: true,
          capacity: true,
          isPublished: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              modules: { where: { deletedAt: null } },
              enrollments: {
                where: {
                  status: CourseEnrollmentStatus.ACTIVE,
                },
              },
            },
          },
          enrollments: {
            where: { memberId: userId },
            select: {
              status: true,
              role: {
                select: {
                  permissions: {
                    where: { enabled: true },
                    select: { permission: true },
                  },
                },
              },
            },
            take: 1,
          },
          invitations: {
            where: {
              inviteeId: userId,
              status: CourseInvitationStatus.PENDING,
            },
            select: { id: true },
            take: 1,
          },
        },
      }),
    ]);

    return {
      items: courses.map((course) => ({
        id: course.id,
        ownerId: course.ownerId,
        title: course.title,
        description: course.description,
        capacity: course.capacity,
        isPublished: course.isPublished,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
        _count: course._count,
        isOwner: course.ownerId === userId,
        membershipStatus:
          course.ownerId === userId
            ? CourseEnrollmentStatus.ACTIVE
            : (course.enrollments[0]?.status ?? null),
        pendingInvitationId: course.invitations[0]?.id ?? null,
        coursePermissions:
          course.enrollments[0]?.role.permissions.map(
            ({ permission }) => permission
          ) ?? [],
      })),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  static async getCourseById(courseId: string, userId: string) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course || course.deletedAt) {
      throw new Error('Course not found');
    }

    const member = await prisma.enrollment.findFirst({
      where: {
        courseId,
        memberId: userId,
        status: CourseEnrollmentStatus.ACTIVE,
      },
    });

    if (!member && course.ownerId !== userId) {
      throw new Error('Unauthorized');
    }

    const coursePermissions = await getCoursePermissions(userId, courseId);
    if (
      coursePermissions.withoutPermission(COURSE_PERMISSION.COURSE_CONTENT_VIEW)
    ) {
      throw new Error('Forbidden');
    }

    return course;
  }

  static async isMember(courseId: string, userId: string) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { deletedAt: true, ownerId: true },
    });

    if (!course || course.deletedAt) return false;
    if (course.ownerId === userId) return true;

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        courseId,
        memberId: userId,
        status: CourseEnrollmentStatus.ACTIVE,
      },
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
    const permissions = await getCoursePermissions(
      options.userId,
      options.courseId
    );
    if (permissions.withoutPermission(COURSE_PERMISSION.COURSE_FILES_VIEW)) {
      throw new Error('Forbidden');
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
    const permissions = await getCoursePermissions(userId, courseId);
    if (
      permissions.withoutPermission(COURSE_PERMISSION.COURSE_ANALYTICS_VIEW)
    ) {
      throw new Error('Forbidden');
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
    const permissions = await getCoursePermissions(
      options.userId,
      options.courseId
    );
    if (permissions.withoutPermission(COURSE_PERMISSION.COURSE_FILES_MANAGE)) {
      throw new Error('Forbidden');
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
    const permissions = await getCoursePermissions(
      options.userId,
      options.courseId
    );
    if (permissions.withoutPermission(COURSE_PERMISSION.COURSE_FILES_MANAGE)) {
      throw new Error('Forbidden');
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
    const permissions = await getCoursePermissions(userId, courseId);
    if (permissions.withoutPermission(COURSE_PERMISSION.COURSE_FILES_MANAGE)) {
      throw new Error('Forbidden');
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
    const permissions = await getCoursePermissions(userId, courseId);
    if (permissions.withoutPermission(COURSE_PERMISSION.COURSE_FILES_MANAGE)) {
      throw new Error('Forbidden');
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
      courseId,
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
    const permissions = await getCoursePermissions(
      options.userId,
      options.courseId
    );
    if (permissions.withoutPermission(COURSE_PERMISSION.COURSE_FILES_MANAGE)) {
      throw new Error('Forbidden');
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
      courseId: options.courseId,
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
    const permissions = await getCoursePermissions(userId, courseId);
    if (permissions.withoutPermission(COURSE_PERMISSION.COURSE_FILES_VIEW)) {
      throw new Error('Forbidden');
    }

    const file = await prisma.fileInventory.findUnique({
      where: { id: fileId },
      select: { courseId: true },
    });

    if (!file || file.courseId !== courseId) {
      throw new Error('File not found in this course');
    }

    return await StorageService.createShareUrl({
      courseId,
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
    const permissions = await getCoursePermissions(userId, courseId);
    if (permissions.withoutPermission(COURSE_PERMISSION.COURSE_FILES_VIEW)) {
      throw new Error('Forbidden');
    }

    const files = await prisma.fileInventory.findMany({
      where: { id: { in: fileIds } },
      select: { courseId: true },
    });

    if (files.some((f) => f.courseId !== courseId)) {
      throw new Error('Some files do not belong to this course');
    }

    return await StorageService.createShareUrlsBatch({
      courseId,
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
    const permissions = await getCoursePermissions(ownerId, courseId);
    if (
      permissions.withoutPermission(COURSE_PERMISSION.COURSE_SETTINGS_MANAGE)
    ) {
      throw new Error('Forbidden');
    }
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course || course.deletedAt) {
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

        // Runs extract → search → generate deltas → done, persists via onEnd
        await aiService.streamCourseToWriter(
          {
            userId: data.userId,
            fileId: data.fileId,
            file: data.file,
            context: data.context,
            apiKey: data.apiKey,
            model: data.model,
            onEnd: async ({ object }) => {
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
    const parseStartedAt = performance.now();
    let totalContentCharacters = 0;
    const moduleRows: Array<{
      id: string;
      courseId: string;
      title: string;
      orderIndex: number;
    }> = [];
    const lessonRows: Array<{
      id: string;
      moduleId: string;
      title: string;
      content: TiptapDocument;
      orderIndex: number;
    }> = [];

    // Parse and prepare every row before opening the transaction. This keeps
    // CPU-heavy HTML conversion out of the transaction's timeout window.
    for (const mod of data.modules) {
      const moduleId = randomUUID();
      moduleRows.push({
        id: moduleId,
        courseId,
        title: mod.title || 'Untitled Module',
        orderIndex: moduleRows.length,
      });

      let lessonOrder = 0;
      for (const lesson of mod.lessons ?? []) {
        const html = lesson.content || '';
        totalContentCharacters += html.length;
        lessonRows.push({
          id: randomUUID(),
          moduleId,
          title: lesson.lessonTitle || 'Untitled Lesson',
          content: htmlToTiptapDocument(html),
          orderIndex: lessonOrder++,
        });
      }
    }

    const parseDurationMs = Math.round(performance.now() - parseStartedAt);
    const transactionStartedAt = performance.now();

    try {
      await prisma.$transaction(async (tx) => {
        const lastModule = await tx.module.findFirst({
          where: { courseId, deletedAt: null },
          orderBy: { orderIndex: 'desc' },
          select: { orderIndex: true },
        });

        const firstModuleOrder = lastModule ? lastModule.orderIndex + 1 : 0;

        await tx.module.createMany({
          data: moduleRows.map((module, index) => ({
            ...module,
            orderIndex: firstModuleOrder + index,
          })),
        });

        await tx.lesson.createMany({ data: lessonRows });
      });
    } catch (error) {
      console.error('Generated course persistence failed', {
        courseId,
        moduleCount: moduleRows.length,
        lessonCount: lessonRows.length,
        totalContentCharacters,
        parseDurationMs,
        transactionDurationMs: Math.round(
          performance.now() - transactionStartedAt
        ),
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }

    console.info('Generated course persistence completed', {
      courseId,
      moduleCount: moduleRows.length,
      lessonCount: lessonRows.length,
      totalContentCharacters,
      parseDurationMs,
      transactionDurationMs: Math.round(
        performance.now() - transactionStartedAt
      ),
    });

    for (const lesson of lessonRows) {
      scheduleLessonContentIndexing(lesson.id);
    }
  }
}
