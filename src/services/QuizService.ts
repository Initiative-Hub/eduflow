import { randomUUID } from 'node:crypto';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, Output } from 'ai';
import type { z } from 'zod';
import type {
  DeliveryMode,
  Prisma,
  QuestionSubType,
  SelectionMethod,
} from '@/generated/prisma';
import { getCoursePermissions } from '@/lib/permissions/course-permission';
import { COURSE_PERMISSION } from '@/lib/permissions/permission-keys';
import { prisma } from '@/lib/prisma';
import {
  getQuestionTaxonomy,
  QUESTION_CATEGORY_BY_SUB_TYPE,
  SUB_TYPE_TO_QUESTION_TYPE,
} from '@/lib/quiz-template';
import type { QuestionBlock } from '@/lib/quiz-template/types';
import {
  createQuizSchema,
  dragAndDropQuestionSchema,
  essayQuestionSchema,
  fillInTheBlankQuestionSchema,
  matchingQuestionSchema,
  multipleChoiceQuestionSchema,
  orderingQuestionSchema,
  questionBlockSchema,
  trueFalseQuestionSchema,
} from '@/lib/validations/quiz.schema';
import {
  DEFAULT_MODELS,
  QUIZ_GENERATION_PROMPT,
} from '@/services/ai/chat-provider.constants';
import type { AIQuizInput } from '@/services/ai/chat-provider.types';
import {
  getQuestionPrompt,
  resolveReferencedQuestions,
} from '../utils/quiz-question-references';
import { safeMapAIQuizToSchema } from './ai/quizMapper';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Recursively extracts plain text from a Tiptap/ProseMirror JSON document node.
 * Falls back to JSON.stringify for unknown content shapes.
 */
function extractTextFromTiptap(node: Record<string, unknown>): string {
  if (node.type === 'text' && typeof node.text === 'string') {
    return node.text;
  }

  if (Array.isArray(node.content)) {
    return (node.content as Record<string, unknown>[])
      .map(extractTextFromTiptap)
      .join(' ');
  }

  return '';
}

/**
 * Converts a lesson's stored Tiptap JSON `content` field into plain text
 * suitable for the AI prompt.
 */
function lessonContentToText(content: unknown): string {
  if (!content) return '';

  try {
    const doc = content as Record<string, unknown>;
    // Tiptap doc node has { type: 'doc', content: [...] }
    if (doc.type === 'doc' || Array.isArray(doc.content)) {
      return extractTextFromTiptap(doc).replace(/\s+/g, ' ').trim();
    }
    return JSON.stringify(content);
  } catch {
    return '';
  }
}

function questionToJson(question: QuestionBlock): Prisma.InputJsonValue {
  return question as unknown as Prisma.InputJsonValue;
}

function getQuestionExplanation(question: QuestionBlock): string | null {
  return typeof question.explanation === 'string' ? question.explanation : null;
}

function withLessonIds<
  T extends {
    lessonQuizzes?: { lesson: { id: string } }[];
    quizQuestions?: {
      questionId: string;
      orderIndex: number;
      question: { answerData: unknown; explanation: string | null };
    }[];
    questions?: unknown;
  },
>(quiz: T) {
  const { lessonQuizzes = [], quizQuestions = [], ...rest } = quiz;
  const resolved = resolveReferencedQuestions(quizQuestions, quiz.questions);
  return {
    ...rest,
    lessonIds: lessonQuizzes.map(({ lesson }) => lesson.id),
    ...resolved,
  };
}

const quizRelations = {
  lessonQuizzes: {
    select: { lesson: { select: { id: true } } },
  },
  quizQuestions: {
    orderBy: { orderIndex: 'asc' as const },
    select: {
      questionId: true,
      orderIndex: true,
      question: { select: { answerData: true, explanation: true } },
    },
  },
};

// CreateQuizInput type used by service-level create helper
export type CreateQuizInput = {
  lessonIds: string[];
  title: string;
  description?: string | null;
  questionCounts: Partial<Record<QuestionSubType, number>>;
  deliveryMode: DeliveryMode;
  selectionMethod: SelectionMethod;
  questionCount: number;
  questions?: QuestionBlock[];
  questionIds?: Array<string | null>;
  selectedQuestionIds?: string[];
};

type AiGenerationInput = {
  topic?: string;
  apiKey?: string;
  model?: string;
  context?: string;
};

type UpdateQuizDetailsInput = {
  title: string;
  description?: string | null;
  lessonIds: string[];
  deliveryMode: DeliveryMode;
};

type GenerationLesson = {
  id: string;
  title: string;
  content: unknown;
};

async function generateQuestionsForLessons(
  lessons: GenerationLesson[],
  questionCounts: Partial<Record<QuestionSubType, number>>,
  aiInput: AiGenerationInput,
  currentQuestions: QuestionBlock[] = []
) {
  const requestedCounts = Object.entries(questionCounts).filter(
    (entry): entry is [QuestionSubType, number] =>
      typeof entry[1] === 'number' && entry[1] > 0
  );
  const requestedTotal = requestedCounts.reduce(
    (total, [, count]) => total + count,
    0
  );
  if (requestedTotal === 0) {
    throw new Error('Quiz has no AI question distribution');
  }
  if (currentQuestions.length >= requestedTotal) {
    throw new Error('Quiz already has the maximum number of questions');
  }
  if (lessons.length === 0) {
    throw new Error('No lessons linked to quiz');
  }

  const lessonText = lessons
    .map((lesson, index) => {
      const body = lessonContentToText(lesson.content);
      const title = lesson.title?.trim() || `Lesson ${index + 1}`;
      return body ? `Lesson: ${title}\n${body}` : `Lesson: ${title}`;
    })
    .join('\n\n---\n\n');
  const currentCounts = currentQuestions.reduce<
    Partial<Record<QuestionSubType, number>>
  >((counts, question) => {
    try {
      const { subType } = getQuestionTaxonomy(question.type);
      counts[subType] = (counts[subType] ?? 0) + 1;
    } catch {
      // Legacy unsupported question types do not consume a requested slot.
    }
    return counts;
  }, {});

  const generatedBatches = await Promise.all(
    requestedCounts.flatMap(([subType, requestedCount]) => {
      const remainingCount = requestedCount - (currentCounts[subType] ?? 0);
      if (remainingCount <= 0) return [];
      return [
        QuizService.createQuiz({
          ...aiInput,
          quizType: SUB_TYPE_TO_QUESTION_TYPE[subType],
          context: aiInput.context
            ? `${aiInput.context}\n\n${lessonText}`
            : lessonText,
          questionNumbers: String(remainingCount),
          topic: aiInput.topic ?? lessons[0]?.title ?? undefined,
          content: lessonText || undefined,
        }).then((generated) => ({ generated, subType })),
      ];
    })
  );

  return generatedBatches.flatMap(({ generated, subType }) => {
    const safe = safeMapAIQuizToSchema(generated, subType);
    const normalized = safe.success ? safe.data : null;
    const questions = normalized
      ? (normalized.questions as QuestionBlock[])
      : (generated.questions as unknown[]).map((question) =>
          questionBlockSchema.parse(question)
        );
    return questions.map((question) => ({
      question,
      subType,
      description: normalized?.description ?? generated.description,
      deliveryMode: normalized?.deliveryMode ?? generated.deliveryMode,
      selectionMethod: normalized?.selectionMethod ?? generated.selectionMethod,
    }));
  });
}

// ─── QuizService ──────────────────────────────────────────────────────────────

export class QuizService {
  static async createQuiz(options: AIQuizInput) {
    const apiKey = options.apiKey ?? process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error(`Missing API key for provider "openrouter"`);

    const model = options.model ?? DEFAULT_MODELS.openrouter;
    const provider = createOpenRouter({ apiKey });

    const normalizedType = options.quizType.toLowerCase();

    // The AI schema omits the discriminator, then we inject the known type.
    const aiQuestionSchemaMap: Record<string, z.ZodTypeAny> = {
      multiple_choice: multipleChoiceQuestionSchema.omit({ type: true }),
      true_false: trueFalseQuestionSchema.omit({ type: true }),
      fill_in_the_blank: fillInTheBlankQuestionSchema.omit({ type: true }),
      matching: matchingQuestionSchema.omit({ type: true }),
      ordering: orderingQuestionSchema.omit({ type: true }),
      drag_and_drop: dragAndDropQuestionSchema.omit({ type: true }),
      essay: essayQuestionSchema.omit({ type: true }),
    };

    const aiQuestionSchema =
      aiQuestionSchemaMap[normalizedType] ??
      aiQuestionSchemaMap.multiple_choice;
    const aiSchema = createQuizSchema(aiQuestionSchema);

    const count = parseInt(options.questionNumbers, 10) || 5;
    const prompt = `
      Generate a complete, high-quality educational Quiz object containing exactly ${count} questions of type "${options.quizType}".
      ${options.topic ? `The quiz topic or theme is: "${options.topic}".` : ''}
      ${options.content ? `Generate the quiz based on the following content:\n\n${options.content}` : 'Generate interesting educational questions.'}

      Instructions:
      1. Provide a clear, engaging title and description for the quiz.
      2. Set category, subType, deliveryMode, and selectionMethod appropriately for the quizType.
      3. Generate exactly ${count} questions in the questions array.
      4. Ensure all option, blank, zone, and item IDs are unique (e.g. opt1, opt2, blank1, zone1, item1, left1, right1).
      5. Provide helpful explanations for each question.
    `;

    const { output } = await generateText({
      model: provider(model),
      output: Output.object({ schema: aiSchema }),
      prompt,
      instructions: QUIZ_GENERATION_PROMPT,
    });

    const questionsWithType = (
      output.questions as Record<string, unknown>[]
    ).map((question) => ({ type: normalizedType, ...question }));

    return { ...output, questions: questionsWithType };
  }

  static async generateDraft(
    courseId: string,
    userId: string,
    input: AiGenerationInput & {
      lessonIds: string[];
      questionCounts: Partial<Record<QuestionSubType, number>>;
    }
  ) {
    const permissions = await getCoursePermissions(userId, courseId);
    if (
      permissions.withoutPermission(COURSE_PERMISSION.ASSESSMENTS_CREATE) ||
      permissions.withoutPermission(COURSE_PERMISSION.AI_USE_COURSE_GENERATION)
    ) {
      throw new Error('Forbidden');
    }

    const lessons = await prisma.lesson.findMany({
      where: {
        id: { in: input.lessonIds },
        deletedAt: null,
        module: { courseId, deletedAt: null },
      },
      select: { id: true, title: true, content: true },
    });
    if (lessons.length !== input.lessonIds.length) {
      throw new Error('Some lessons do not belong to this course');
    }

    const generated = await generateQuestionsForLessons(
      lessons,
      input.questionCounts,
      input
    );
    return {
      questions: generated.map(({ question }) => question),
    };
  }

  static async createForCourse(
    courseId: string,
    userId: string,
    data: CreateQuizInput
  ) {
    const createPermissions = await getCoursePermissions(userId, courseId);
    if (
      createPermissions.withoutPermission(COURSE_PERMISSION.ASSESSMENTS_CREATE)
    ) {
      throw new Error('Forbidden');
    }

    const linkedLessons = await prisma.lesson.findMany({
      where: {
        id: { in: data.lessonIds },
        deletedAt: null,
        module: {
          courseId,
          deletedAt: null,
          course: { deletedAt: null },
        },
      },
      select: { id: true },
    });

    if (linkedLessons.length !== data.lessonIds.length) {
      throw new Error('Some lessons do not belong to this course');
    }

    let selectedQuestionIds: string[] = [];

    if (
      (data.questions?.length ?? 0) === 0 &&
      data.selectionMethod !== 'MANUAL_CREATE'
    ) {
      const requestedSubTypes = Object.entries(data.questionCounts)
        .filter(([, count]) => (count ?? 0) > 0)
        .map(([subType]) => subType as QuestionSubType);
      const questionWhere: Record<string, unknown> = { courseId };
      if (
        data.selectionMethod === 'HAND_PICK' &&
        data.selectedQuestionIds?.length
      ) {
        questionWhere.id = { in: data.selectedQuestionIds };
      } else if (requestedSubTypes.length > 0) {
        questionWhere.subType = { in: requestedSubTypes };
      }

      const bankQuestions = await prisma.question.findMany({
        where: questionWhere,
        orderBy: { createdAt: 'desc' },
      });

      let selectedQuestions = bankQuestions;
      if (data.selectionMethod === 'RANDOM') {
        selectedQuestions = requestedSubTypes.flatMap((subType) => {
          const shuffled = bankQuestions
            .filter((question) => question.subType === subType)
            .sort(() => Math.random() - 0.5);
          return shuffled.slice(0, data.questionCounts[subType] ?? 0);
        });
      } else if (data.selectedQuestionIds?.length) {
        const questionsById = new Map(
          bankQuestions.map((question) => [question.id, question])
        );
        selectedQuestions = data.selectedQuestionIds.flatMap((questionId) => {
          const question = questionsById.get(questionId);
          return question ? [question] : [];
        });
      } else {
        selectedQuestions = bankQuestions.slice(0, data.questionCount);
      }
      selectedQuestionIds = selectedQuestions.map(({ id }) => id);
    }

    const quiz = await prisma.$transaction(async (tx) => {
      if (data.questions?.length) {
        const existingQuestionIds = data.questionIds?.filter(
          (questionId): questionId is string => Boolean(questionId)
        );

        if (existingQuestionIds?.length) {
          const existingQuestions = await tx.question.findMany({
            where: { id: { in: existingQuestionIds }, courseId },
            select: { id: true },
          });
          const foundQuestionIds = new Set(
            existingQuestions.map(({ id }) => id)
          );
          const allQuestionIdsExist = existingQuestionIds.every((questionId) =>
            foundQuestionIds.has(questionId)
          );
          if (!allQuestionIdsExist) throw new Error('Question not found');
        }

        const generatedQuestionIds = new Map<number, string>();
        const questionsToCreate: Prisma.QuestionCreateManyInput[] = [];

        for (const [index, questionData] of data.questions.entries()) {
          if (data.questionIds?.[index]) continue;
          const taxonomy = getQuestionTaxonomy(questionData.type);
          const questionId = randomUUID();
          generatedQuestionIds.set(index, questionId);
          questionsToCreate.push({
            id: questionId,
            courseId,
            ...taxonomy,
            prompt: getQuestionPrompt(questionData),
            answerData: questionToJson(questionData),
            explanation: getQuestionExplanation(questionData),
          });
        }

        if (questionsToCreate.length > 0) {
          await tx.question.createMany({
            data: questionsToCreate,
          });
        }

        selectedQuestionIds = data.questions.map((_, index) => {
          const existingQuestionId = data.questionIds?.[index];
          if (existingQuestionId) return existingQuestionId;
          const generatedQuestionId = generatedQuestionIds.get(index);
          if (!generatedQuestionId) throw new Error('Question not found');
          return generatedQuestionId;
        });
      }

      const createdQuiz = await tx.quiz.create({
        data: {
          courseId,
          title: data.title,
          description: data.description ?? null,
          deliveryMode: data.deliveryMode,
          selectionMethod: data.selectionMethod,
          questionCount: selectedQuestionIds.length,
          questionCounts: data.questionCounts,
          questions: [],
        },
        select: { id: true },
      });

      if (data.lessonIds.length > 0) {
        await tx.lessonQuiz.createMany({
          data: data.lessonIds.map((lessonId) => ({
            quizId: createdQuiz.id,
            lessonId,
          })),
        });
      }

      if (selectedQuestionIds.length > 0) {
        await tx.quizQuestion.createMany({
          data: selectedQuestionIds.map((questionId, orderIndex) => ({
            quizId: createdQuiz.id,
            questionId,
            orderIndex,
          })),
        });
      }

      const persistedQuiz = await tx.quiz.findUnique({
        where: { id: createdQuiz.id },
        include: quizRelations,
      });
      if (!persistedQuiz) throw new Error('Quiz not found');

      return persistedQuiz;
    });

    return withLessonIds(quiz);
  }
  static async updateQuestions(
    quizId: string,
    userId: string,
    questions: QuestionBlock[],
    questionIds: Array<string | null>
  ) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        id: true,
        courseId: true,
      },
    });

    if (!quiz) {
      throw new Error('Quiz not found');
    }

    const updatePermissions = await getCoursePermissions(userId, quiz.courseId);
    if (
      updatePermissions.withoutPermission(COURSE_PERMISSION.ASSESSMENTS_UPDATE)
    ) {
      throw new Error('Forbidden');
    }

    const persistedQuestionIds = questions.map(
      (_, index) => questionIds[index] ?? randomUUID()
    );
    const questionWrites = questions.map((questionData, index) => {
      const explanation =
        typeof questionData.explanation === 'string'
          ? questionData.explanation
          : null;
      const taxonomy = getQuestionTaxonomy(questionData.type);
      const data = {
        ...taxonomy,
        prompt: getQuestionPrompt(questionData),
        answerData: questionToJson(questionData),
        explanation,
      };

      return {
        existingQuestionId: questionIds[index],
        persistedQuestionId: persistedQuestionIds[index],
        data,
      };
    });
    const questionsToCreate: Prisma.QuestionCreateManyInput[] = questionWrites
      .filter(({ existingQuestionId }) => !existingQuestionId)
      .map(({ persistedQuestionId, data }) => ({
        id: persistedQuestionId,
        courseId: quiz.courseId,
        ...data,
      }));
    const questionsToUpdate = questionWrites.filter(
      (
        write
      ): write is typeof write & {
        existingQuestionId: string;
      } => Boolean(write.existingQuestionId)
    );

    const updatedQuiz = await prisma.$transaction(async (tx) => {
      await Promise.all(
        questionsToUpdate.map(async ({ existingQuestionId, data }) => {
          const updated = await tx.question.updateMany({
            where: { id: existingQuestionId, courseId: quiz.courseId },
            data,
          });
          if (updated.count !== 1) throw new Error('Question not found');
        })
      );

      if (questionsToCreate.length > 0) {
        await tx.question.createMany({
          data: questionsToCreate,
        });
      }

      await tx.quizQuestion.deleteMany({ where: { quizId } });
      if (persistedQuestionIds.length > 0) {
        await tx.quizQuestion.createMany({
          data: persistedQuestionIds.map((questionId, orderIndex) => ({
            quizId,
            questionId,
            orderIndex,
          })),
        });
      }

      return tx.quiz.update({
        where: { id: quizId },
        data: {
          questions: [],
          questionCount: persistedQuestionIds.length,
        },
        include: quizRelations,
      });
    });

    return withLessonIds(updatedQuiz);
  }

  static async updateDetails(
    quizId: string,
    userId: string,
    data: UpdateQuizDetailsInput
  ) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        id: true,
        courseId: true,
      },
    });

    if (!quiz) {
      throw new Error('Quiz not found');
    }

    const updatePermissions = await getCoursePermissions(userId, quiz.courseId);
    if (
      updatePermissions.withoutPermission(COURSE_PERMISSION.ASSESSMENTS_UPDATE)
    ) {
      throw new Error('Forbidden');
    }

    const linkedLessons = await prisma.lesson.findMany({
      where: {
        id: { in: data.lessonIds },
        deletedAt: null,
        module: {
          courseId: quiz.courseId,
          deletedAt: null,
          course: { deletedAt: null },
        },
      },
      select: { id: true },
    });

    if (linkedLessons.length !== data.lessonIds.length) {
      throw new Error('Some lessons do not belong to this course');
    }

    const updatedQuiz = await prisma.$transaction(async (tx) => {
      await tx.lessonQuiz.deleteMany({ where: { quizId } });
      await tx.lessonQuiz.createMany({
        data: data.lessonIds.map((lessonId) => ({ quizId, lessonId })),
      });

      return tx.quiz.update({
        where: { id: quizId },
        data: {
          title: data.title,
          description: data.description?.trim() || null,
          deliveryMode: data.deliveryMode,
        },
        include: quizRelations,
      });
    });

    return withLessonIds(updatedQuiz);
  }

  /**
   * Generates a quiz via AI using the quiz's linked lesson contents, then saves it to the DB.
   *
   * @param quizId         - The quiz ID (used to load linked lessons)
   * @param aiInput        - Optional AI options (topic, apiKey, model).
   *                         Do NOT pass `content` — it is fetched from linked lessons automatically.
   * @returns The newly created Quiz record
   */
  static async generateAndSave(
    quizId: string,
    userId: string,
    aiInput: {
      topic?: string;
      apiKey?: string;
      model?: string;
      context?: string;
    }
  ) {
    const fetchedQuiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        lessonQuizzes: {
          select: {
            lesson: { select: { id: true, title: true, content: true } },
          },
        },
        quizQuestions: {
          orderBy: { orderIndex: 'asc' },
          select: {
            questionId: true,
            orderIndex: true,
            question: { select: { answerData: true, explanation: true } },
          },
        },
      },
    });
    if (!fetchedQuiz) {
      throw new Error('Quiz not found');
    }

    const updatePermissions = await getCoursePermissions(
      userId,
      fetchedQuiz.courseId
    );
    if (
      updatePermissions.withoutPermission(
        COURSE_PERMISSION.ASSESSMENTS_UPDATE
      ) ||
      updatePermissions.withoutPermission(
        COURSE_PERMISSION.AI_USE_COURSE_GENERATION
      )
    ) {
      throw new Error('Forbidden');
    }

    const currentQuestions = resolveReferencedQuestions(
      fetchedQuiz.quizQuestions,
      fetchedQuiz.questions
    ).questions;
    const requestedCounts = Object.entries(
      fetchedQuiz.questionCounts as Partial<Record<QuestionSubType, number>>
    ).filter(
      (entry): entry is [QuestionSubType, number] =>
        typeof entry[1] === 'number' && entry[1] > 0
    );
    const requestedTotal = requestedCounts.reduce(
      (total, [, count]) => total + count,
      0
    );
    if (requestedTotal === 0) {
      throw new Error('Quiz has no AI question distribution');
    }
    if (currentQuestions.length >= requestedTotal) {
      throw new Error('Quiz already has the maximum number of questions');
    }
    // Aggregate content from all linked lessons
    const lessons = fetchedQuiz.lessonQuizzes.map(({ lesson }) => lesson);
    if (lessons.length === 0) {
      throw new Error('No lessons linked to quiz');
    }

    const lessonText = lessons
      .map((lesson, index) => {
        const body = lessonContentToText(lesson.content);
        const title = lesson.title?.trim() || `Lesson ${index + 1}`;

        // Prefix each section with lesson title so the model can keep context boundaries.
        return body ? `Lesson: ${title}\n${body}` : `Lesson: ${title}`;
      })
      .join('\n\n---\n\n');

    const currentCounts = currentQuestions.reduce<
      Partial<Record<QuestionSubType, number>>
    >((counts, question) => {
      try {
        const { subType } = getQuestionTaxonomy(question.type);
        counts[subType] = (counts[subType] ?? 0) + 1;
      } catch {
        // Legacy unsupported question types do not consume a requested slot.
      }
      return counts;
    }, {});

    // Generate each requested type independently so a quiz can mix formats.
    const generatedBatches = await Promise.all(
      requestedCounts.flatMap(([subType, requestedCount]) => {
        const remainingCount = requestedCount - (currentCounts[subType] ?? 0);
        if (remainingCount <= 0) return [];
        return [
          QuizService.createQuiz({
            ...aiInput,
            quizType: SUB_TYPE_TO_QUESTION_TYPE[subType],
            context: aiInput.context
              ? `${aiInput.context}\n\n${lessonText}`
              : lessonText,
            questionNumbers: String(remainingCount),
            topic: aiInput.topic ?? lessons[0]?.title ?? undefined,
            content: lessonText || undefined,
          }).then((generated) => ({ generated, subType })),
        ];
      })
    );
    const generatedQuestions = generatedBatches.flatMap(
      ({ generated, subType }) => {
        const safe = safeMapAIQuizToSchema(generated, subType);
        const normalized = safe.success ? safe.data : null;
        const questions = normalized
          ? (normalized.questions as QuestionBlock[])
          : (generated.questions as unknown[]).map((question) =>
              questionBlockSchema.parse(question)
            );
        return questions.map((question) => ({
          question,
          subType,
          description: normalized?.description ?? generated.description,
          deliveryMode: normalized?.deliveryMode ?? generated.deliveryMode,
          selectionMethod:
            normalized?.selectionMethod ?? generated.selectionMethod,
        }));
      }
    );

    // 3. Persist to the database (use normalized questions when available)
    const quiz = await prisma.$transaction(async (tx) => {
      const createdQuestions = await Promise.all(
        generatedQuestions.map(({ question, subType }) =>
          tx.question.create({
            data: {
              courseId: fetchedQuiz.courseId,
              category: QUESTION_CATEGORY_BY_SUB_TYPE[subType],
              subType,
              prompt: getQuestionPrompt(question),
              answerData: questionToJson(question),
              explanation: getQuestionExplanation(question),
            },
            select: { id: true },
          })
        )
      );

      if (createdQuestions.length > 0) {
        await tx.quizQuestion.createMany({
          data: createdQuestions.map(({ id: questionId }, orderIndex) => ({
            quizId,
            questionId,
            orderIndex: currentQuestions.length + orderIndex,
          })),
        });
      }

      return tx.quiz.update({
        where: { id: quizId },
        data: {
          description: (generatedQuestions[0]?.description ??
            fetchedQuiz.description) as string | null,
          deliveryMode: (generatedQuestions[0]?.deliveryMode ??
            fetchedQuiz.deliveryMode) as DeliveryMode,
          selectionMethod: (generatedQuestions[0]?.selectionMethod ??
            fetchedQuiz.selectionMethod) as SelectionMethod,
          questionCount: requestedTotal,
          questions: [],
        },
        include: quizRelations,
      });
    });

    return withLessonIds(quiz);
  }
}
