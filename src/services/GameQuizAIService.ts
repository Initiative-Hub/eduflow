import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, Output } from 'ai';
import * as z from 'zod';
import { CourseEnrollmentStatus, CourseRoleName } from '@/generated/prisma';
import {
  type GameQuizAIGenerationInput,
  type GameQuizAIGenerationResponse,
  type GameQuizAISourcesResponse,
  gameQuizAIGeneratedQuestionSchema,
  gameQuizAIGenerationResponseSchema,
} from '@/lib/game-quiz/ai-schemas';
import { gameQuizQuestionSchema } from '@/lib/game-quiz/schemas';
import { COURSE_PERMISSION } from '@/lib/permissions/permission-keys';
import { prisma } from '@/lib/prisma';
import { tiptapDocumentToMarkdown } from '@/lib/tiptap-markdown';
import { isTiptapDocument } from '@/utils/lesson-content';
import { DEFAULT_MODELS } from './ai/chat-provider.constants';
import {
  buildGameQuizGenerationPrompt,
  isGameQuizGenerationTimeout,
  rawGeneratedGameQuizQuestionSchema,
} from './game-quiz-ai-generation';

const GAME_QUIZ_AI_TIMEOUT_MS = 60_000;
const ELIGIBLE_COURSE_ROLES = [
  CourseRoleName.COURSE_OWNER,
  CourseRoleName.TEACHER,
] as const;
const REQUIRED_PERMISSIONS = [
  COURSE_PERMISSION.COURSE_CONTENT_VIEW,
  COURSE_PERMISSION.AI_USE_COURSE_GENERATION,
] as const;

export type GameQuizAIServiceErrorCode =
  | 'INVALID_LESSON_CONTENT'
  | 'FORBIDDEN'
  | 'AI_CONFIGURATION_ERROR'
  | 'AI_GENERATION_FAILED'
  | 'AI_GENERATION_TIMEOUT';

export class GameQuizAIServiceError extends Error {
  readonly cause?: unknown;

  constructor(
    readonly code: GameQuizAIServiceErrorCode,
    message: string,
    readonly status: 400 | 403 | 502 | 503 | 504,
    cause?: unknown
  ) {
    super(message);
    this.name = 'GameQuizAIServiceError';
    this.cause = cause;
  }
}

type CoursePermissionEntry = {
  permission: string;
  courseRole: { name: CourseRoleName };
};

function hasRequiredPermissions(
  permissions: CoursePermissionEntry[],
  role: CourseRoleName
): boolean {
  const enabledPermissions = new Set(
    permissions
      .filter(({ courseRole }) => courseRole.name === role)
      .map(({ permission }) => permission)
  );

  return REQUIRED_PERMISSIONS.every((permission) =>
    enabledPermissions.has(permission)
  );
}

function resolveApplicableRole(
  course: {
    ownerId: string;
    enrollments: Array<{ role: { name: CourseRoleName } }>;
  },
  userId: string
): CourseRoleName | null {
  if (course.ownerId === userId) {
    return CourseRoleName.COURSE_OWNER;
  }

  return course.enrollments[0]?.role.name ?? null;
}

export class GameQuizAIService {
  static async listSources(userId: string): Promise<GameQuizAISourcesResponse> {
    const courses = await prisma.course.findMany({
      where: {
        archivedAt: null,
        deletedAt: null,
        OR: [
          { ownerId: userId },
          {
            enrollments: {
              some: {
                memberId: userId,
                status: CourseEnrollmentStatus.ACTIVE,
                role: { name: { in: [...ELIGIBLE_COURSE_ROLES] } },
              },
            },
          },
        ],
      },
      orderBy: { title: 'asc' },
      select: {
        id: true,
        title: true,
        ownerId: true,
        permissions: {
          where: {
            enabled: true,
            permission: { in: [...REQUIRED_PERMISSIONS] },
          },
          select: {
            permission: true,
            courseRole: { select: { name: true } },
          },
        },
        enrollments: {
          where: {
            memberId: userId,
            status: CourseEnrollmentStatus.ACTIVE,
            role: { name: { in: [...ELIGIBLE_COURSE_ROLES] } },
          },
          select: { role: { select: { name: true } } },
          take: 1,
        },
        modules: {
          where: { deletedAt: null },
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            title: true,
            lessons: {
              where: { deletedAt: null },
              orderBy: { orderIndex: 'asc' },
              select: { id: true, title: true },
            },
          },
        },
      },
    });

    return {
      courses: courses.flatMap((course) => {
        const role = resolveApplicableRole(course, userId);
        if (!role || !hasRequiredPermissions(course.permissions, role)) {
          return [];
        }

        return [
          {
            id: course.id,
            title: course.title,
            modules: course.modules,
          },
        ];
      }),
    };
  }

  static async generateQuestions(
    userId: string,
    input: GameQuizAIGenerationInput
  ): Promise<GameQuizAIGenerationResponse> {
    const course = await prisma.course.findFirst({
      where: {
        id: input.courseId,
        archivedAt: null,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        ownerId: true,
        permissions: {
          where: {
            enabled: true,
            permission: { in: [...REQUIRED_PERMISSIONS] },
          },
          select: {
            permission: true,
            courseRole: { select: { name: true } },
          },
        },
        enrollments: {
          where: {
            memberId: userId,
            status: CourseEnrollmentStatus.ACTIVE,
            role: { name: { in: [...ELIGIBLE_COURSE_ROLES] } },
          },
          select: { role: { select: { name: true } } },
          take: 1,
        },
        modules: {
          where: { deletedAt: null },
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            title: true,
            lessons: {
              where: {
                id: { in: input.lessonIds },
                deletedAt: null,
              },
              orderBy: { orderIndex: 'asc' },
              select: { id: true, title: true, content: true },
            },
          },
        },
      },
    });

    const role = course ? resolveApplicableRole(course, userId) : null;
    if (!course || !role || !hasRequiredPermissions(course.permissions, role)) {
      throw new GameQuizAIServiceError(
        'FORBIDDEN',
        'The selected course is not available for AI quiz generation',
        403
      );
    }

    const selectedLessons = course.modules.flatMap((module) =>
      module.lessons.map((lesson) => ({ module, lesson }))
    );
    if (selectedLessons.length !== input.lessonIds.length) {
      throw new GameQuizAIServiceError(
        'FORBIDDEN',
        'One or more selected lessons are not available in this course',
        403
      );
    }

    const lessonSections = selectedLessons.map(({ module, lesson }) => {
      if (!isTiptapDocument(lesson.content)) {
        throw new GameQuizAIServiceError(
          'INVALID_LESSON_CONTENT',
          `Lesson "${lesson.title}" does not contain readable text content`,
          400
        );
      }

      let markdown = '';
      try {
        markdown = tiptapDocumentToMarkdown(lesson.content).trim();
      } catch (error) {
        throw new GameQuizAIServiceError(
          'INVALID_LESSON_CONTENT',
          `Lesson "${lesson.title}" contains invalid content`,
          400,
          error
        );
      }

      if (!markdown) {
        throw new GameQuizAIServiceError(
          'INVALID_LESSON_CONTENT',
          `Lesson "${lesson.title}" does not contain readable text content`,
          400
        );
      }

      return `## Module: ${module.title}\n### Lesson: ${lesson.title}\n${markdown}`;
    });

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new GameQuizAIServiceError(
        'AI_CONFIGURATION_ERROR',
        'AI quiz generation is not configured',
        503
      );
    }

    const generatedOutputSchema = z.object({
      questions: z
        .array(rawGeneratedGameQuizQuestionSchema)
        .length(input.questionCount),
    });
    const provider = createOpenRouter({ apiKey });
    const lessonContext = `# Course: ${course.title}\n\n${lessonSections.join(
      '\n\n---\n\n'
    )}`;

    try {
      const { output } = await generateText({
        model: provider(DEFAULT_MODELS.openrouter),
        output: Output.object({ schema: generatedOutputSchema }),
        prompt: buildGameQuizGenerationPrompt(
          input,
          course.title,
          lessonContext
        ),
        timeout: GAME_QUIZ_AI_TIMEOUT_MS,
      });

      if (output.questions.length !== input.questionCount) {
        throw new Error(
          `AI returned ${output.questions.length} questions; expected ${input.questionCount}`
        );
      }

      const questions = output.questions.map((question) => {
        const normalized = {
          prompt: question.prompt,
          hint: question.hint,
          explanation: question.explanation,
          timerSeconds: question.timerSeconds,
          maxPoints: question.maxPoints,
          options: question.options.map((text, index) => ({
            text,
            isCorrect: index === question.correctOptionIndex,
          })),
        };

        const gameQuestion = gameQuizQuestionSchema.parse(normalized);
        return gameQuizAIGeneratedQuestionSchema.parse(gameQuestion);
      });

      return gameQuizAIGenerationResponseSchema.parse({ questions });
    } catch (error) {
      if (error instanceof GameQuizAIServiceError) {
        throw error;
      }
      if (isGameQuizGenerationTimeout(error)) {
        throw new GameQuizAIServiceError(
          'AI_GENERATION_TIMEOUT',
          'AI quiz generation timed out',
          504,
          error
        );
      }
      throw new GameQuizAIServiceError(
        'AI_GENERATION_FAILED',
        'AI could not generate valid quiz questions',
        502,
        error
      );
    }
  }
}
