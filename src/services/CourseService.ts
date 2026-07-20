import { randomUUID } from 'node:crypto';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { Output, streamText } from 'ai';
import { after } from 'next/server';
import {
  CourseEnrollmentStatus,
  CourseInvitationStatus,
  CourseRoleName,
} from '@/generated/prisma';
import {
  deleteCourseContentGenerationControl,
  isCourseContentSearchSkipRequested,
} from '@/lib/course-content/generation-control';
import { pdfToMarkdown } from '@/lib/pdf';
import { getCoursePermissions } from '@/lib/permissions/course-permission';
import {
  COURSE_PERMISSION,
  COURSE_PERMISSION_KEYS,
  type CoursePermissionKey,
} from '@/lib/permissions/permission-keys';
import { prisma } from '@/lib/prisma';
import { htmlToTiptapDocument } from '@/lib/tiptap-html';
import {
  type AICourseContentGeneration,
  aiCourseContentGenerationSchema,
} from '@/lib/validations/course.schema';
import {
  COURSE_CONTENT_GENERATION_PROMPT,
  DEFAULT_MODELS,
} from '@/services/ai/chat-provider.constants';
import type { StreamCourseContentInput } from '@/services/ai/chat-provider.types';
import { generateSupplementarySearchContexts } from '@/services/ai/course-web-search';
import { LessonContentEmbeddingService } from '@/services/LessonContentEmbeddingService';
import { StorageService } from '@/services/StorageService';
import type { CourseContentStreamEvent } from '@/types/course-content-stream-event';
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
  static async streamCourseContentToWriter(
    options: StreamCourseContentInput,
    writer: WritableStreamDefaultWriter<string>
  ): Promise<void> {
    const emit = async (event: CourseContentStreamEvent) =>
      writer.write(`${JSON.stringify(event)}\n`);

    await emit({ type: 'extract' });

    let pdfBuffer: Buffer;
    if (options.fileId) {
      const payload = await StorageService.getDownloadPayload({
        userId: options.userId,
        fileId: options.fileId,
      });
      pdfBuffer = Buffer.from(payload.bytes);
    } else if (options.file) {
      pdfBuffer = Buffer.from(await options.file.arrayBuffer());
    } else {
      throw new Error('Missing file or fileId');
    }

    const markdownContent = await pdfToMarkdown(pdfBuffer);

    await emit({ type: 'search' });

    const searchQuery = options.context
      ? `${options.context} ${markdownContent.slice(0, 150)}`
      : markdownContent.slice(0, 200);

    const apiKey = options.apiKey ?? process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error(`Missing API key for provider "openrouter"`);

    const model = options.model ?? DEFAULT_MODELS.openrouter;
    const provider = createOpenRouter({ apiKey });

    const searchAbortController = new AbortController();
    let checkingSkip = false;
    const checkForSearchSkip = async () => {
      if (
        !options.controlId ||
        checkingSkip ||
        searchAbortController.signal.aborted
      ) {
        return;
      }

      checkingSkip = true;
      try {
        if (await isCourseContentSearchSkipRequested(options.controlId)) {
          searchAbortController.abort();
        }
      } catch (error) {
        console.error('Course content search skip check failed:', error);
      } finally {
        checkingSkip = false;
      }
    };

    await checkForSearchSkip();
    const skipCheckInterval = options.controlId
      ? setInterval(() => void checkForSearchSkip(), 250)
      : null;

    let searchResult: Awaited<
      ReturnType<typeof generateSupplementarySearchContexts>
    >;

    try {
      searchResult = await generateSupplementarySearchContexts({
        model: provider(model),
        searchQuery,
        abortSignal: searchAbortController.signal,
        onSource: async ({ sourceKind, source }) => {
          await emit({ type: 'source-found', sourceKind, source });
        },
        onSearchComplete: async ({ sourceKind, count }) => {
          await emit({ type: 'search-complete', sourceKind, count });
        },
      });
    } finally {
      if (skipCheckInterval) clearInterval(skipCheckInterval);
    }

    if (searchResult.status === 'skipped') {
      await emit({ type: 'search-skipped' });
    } else if (searchResult.status === 'failed') {
      await emit({
        type: 'search-failed',
        message: searchResult.message ?? 'Web search failed',
      });
    }

    const webContextJSON = JSON.stringify(searchResult.webContext, null, 2);
    const youtubeContextJSON = JSON.stringify(
      searchResult.youtubeContext,
      null,
      2
    );

    const result = streamText({
      model: provider(model),
      output: Output.object({ schema: aiCourseContentGenerationSchema }),
      instructions: COURSE_CONTENT_GENERATION_PROMPT,
      prompt: `
        Content to analyze and transform into a course:

        ${markdownContent}

        ${
          options.context
            ? `=== ADDITIONAL CONTEXT FROM INSTRUCTOR ===\n${options.context}`
            : ''
        }

        === SUPPLEMENTARY WEB CONTEXT ===
        Use the following web search results to enrich lesson content with current, real-world examples and up-to-date information:

        ${webContextJSON}

        === SUPPLEMENTARY YOUTUBE VIDEOS ===
        For each module or lesson, pick the most relevant YouTube video from the list below if it matches the topic, and embed it at the end of the lesson's HTML content using this exact HTML structure:
        <div data-youtube-video="">
          <iframe src="https://www.youtube.com/embed/VIDEO_ID" width="640" height="480" allowfullscreen="true"></iframe>
        </div>
        Extract the 11-character video ID from the search results to form the "/embed/VIDEO_ID" URL. Do NOT output standard links or plain paragraphs for the YouTube video URL; use only the exact div and iframe structure above. Only choose relevant videos from this list:

        ${youtubeContextJSON}
      `,
    });

    for await (const chunk of result.textStream) {
      await emit({ type: 'generate', delta: chunk });
    }

    const generatedCourseContent = await result.output;
    await options.onEnd?.({ object: generatedCourseContent });
    await emit({ type: 'done' });
  }

  static generateCourseContentStream(data: {
    userId: string;
    courseId: string;
    fileId?: string;
    file?: File;
    context?: string;
    apiKey?: string;
    model?: string;
    controlId?: string;
  }): ReadableStream<string> {
    const { readable, writable } = new TransformStream<string, string>();
    const writer = writable.getWriter();

    (async () => {
      try {
        // Runs extract → search → generate deltas → done, persists via onEnd
        await CourseService.streamCourseContentToWriter(
          {
            userId: data.userId,
            fileId: data.fileId,
            file: data.file,
            context: data.context,
            apiKey: data.apiKey,
            model: data.model,
            controlId: data.controlId,
            onEnd: async ({ object }) => {
              if (!object) return;
              // Emit save event before persisting
              await writer.write(`${JSON.stringify({ type: 'save' })}\n`);
              await CourseService.saveGeneratedCourseContent(
                data.courseId,
                object
              );
            },
          },
          writer
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.log('Error in course content stream:', message);
        await writer.write(`${JSON.stringify({ type: 'error', message })}\n`);
      } finally {
        if (data.controlId) {
          try {
            await deleteCourseContentGenerationControl(data.controlId);
          } catch (error) {
            console.error(
              'Course content generation control cleanup failed:',
              error
            );
          }
        }
        await writer.close();
      }
    })();

    return readable;
  }

  static async saveGeneratedCourseContent(
    courseId: string,
    data: AICourseContentGeneration
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
