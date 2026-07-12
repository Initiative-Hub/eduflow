import type {
  DeliveryMode,
  Prisma,
  QuestionSubType,
  SelectionMethod,
} from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import {
  getQuestionTaxonomy,
  QUESTION_CATEGORY_BY_SUB_TYPE,
  SUB_TYPE_TO_QUESTION_TYPE,
} from '@/lib/quiz-template';
import type { QuestionBlock } from '@/lib/quiz-template/types';
import { questionBlockSchema } from '@/lib/validations/quiz.schema';
import { CourseService } from '@/services/CourseService';
import { OpenRouterService } from './ai/OpenRouterService';
import { safeMapAIQuizToSchema } from './ai/quizMapper';
import {
  getQuestionPrompt,
  resolveReferencedQuestions,
} from './quiz-question-references';

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

  const service = new OpenRouterService();
  const generatedBatches = await Promise.all(
    requestedCounts.flatMap(([subType, requestedCount]) => {
      const remainingCount = requestedCount - (currentCounts[subType] ?? 0);
      if (remainingCount <= 0) return [];
      return [
        service
          .createQuiz({
            ...aiInput,
            quizType: SUB_TYPE_TO_QUESTION_TYPE[subType],
            context: aiInput.context
              ? `${aiInput.context}\n\n${lessonText}`
              : lessonText,
            questionNumbers: String(remainingCount),
            topic: aiInput.topic ?? lessons[0]?.title ?? undefined,
            content: lessonText || undefined,
          })
          .then((generated) => ({ generated, subType })),
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
  static async generateDraft(
    courseId: string,
    userId: string,
    input: AiGenerationInput & {
      lessonIds: string[];
      questionCounts: Partial<Record<QuestionSubType, number>>;
    }
  ) {
    await CourseService.assertCourseOwner(courseId, userId);
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
    await CourseService.assertCourseOwner(courseId, userId);

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
        selectedQuestionIds = [];
        for (const [index, questionData] of data.questions.entries()) {
          const existingQuestionId = data.questionIds?.[index];
          if (existingQuestionId) {
            const existing = await tx.question.findFirst({
              where: { id: existingQuestionId, courseId },
              select: { id: true },
            });
            if (!existing) throw new Error('Question not found');
            selectedQuestionIds.push(existing.id);
            continue;
          }

          const taxonomy = getQuestionTaxonomy(questionData.type);
          const created = await tx.question.create({
            data: {
              courseId,
              ...taxonomy,
              prompt: getQuestionPrompt(questionData),
              answerData: questionToJson(questionData),
              explanation: getQuestionExplanation(questionData),
            },
            select: { id: true },
          });
          selectedQuestionIds.push(created.id);
        }
      }

      return tx.quiz.create({
        data: {
          courseId,
          title: data.title,
          description: data.description ?? null,
          deliveryMode: data.deliveryMode,
          selectionMethod: data.selectionMethod,
          questionCount: selectedQuestionIds.length,
          questionCounts: data.questionCounts,
          questions: [],
          lessonQuizzes: {
            create: data.lessonIds.map((lessonId) => ({ lessonId })),
          },
          quizQuestions: {
            create: selectedQuestionIds.map((questionId, orderIndex) => ({
              questionId,
              orderIndex,
            })),
          },
        },
        include: quizRelations,
      });
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
        course: { select: { ownerId: true } },
      },
    });

    if (!quiz) {
      throw new Error('Quiz not found');
    }
    if (quiz.course.ownerId !== userId) {
      throw new Error('Forbidden');
    }

    const updatedQuiz = await prisma.$transaction(async (tx) => {
      const persistedQuestionIds: string[] = [];

      for (const [orderIndex, questionData] of questions.entries()) {
        const questionId = questionIds[orderIndex];
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

        if (questionId) {
          const updated = await tx.question.updateMany({
            where: { id: questionId, courseId: quiz.courseId },
            data,
          });
          if (updated.count !== 1) throw new Error('Question not found');
          persistedQuestionIds.push(questionId);
        } else {
          const created = await tx.question.create({
            data: {
              courseId: quiz.courseId,
              ...data,
            },
            select: { id: true },
          });
          persistedQuestionIds.push(created.id);
        }
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
        course: { select: { ownerId: true } },
      },
    });

    if (!quiz) {
      throw new Error('Quiz not found');
    }
    if (quiz.course.ownerId !== userId) {
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
        course: { select: { ownerId: true } },
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
    if (fetchedQuiz.course.ownerId !== userId) {
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
    const service = new OpenRouterService();
    const generatedBatches = await Promise.all(
      requestedCounts.flatMap(([subType, requestedCount]) => {
        const remainingCount = requestedCount - (currentCounts[subType] ?? 0);
        if (remainingCount <= 0) return [];
        return [
          service
            .createQuiz({
              ...aiInput,
              quizType: SUB_TYPE_TO_QUESTION_TYPE[subType],
              context: aiInput.context
                ? `${aiInput.context}\n\n${lessonText}`
                : lessonText,
              questionNumbers: String(remainingCount),
              topic: aiInput.topic ?? lessons[0]?.title ?? undefined,
              content: lessonText || undefined,
            })
            .then((generated) => ({ generated, subType })),
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
