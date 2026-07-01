import type {
  DeliveryMode,
  Prisma,
  QuestionSubType,
  QuizCategory,
  SelectionMethod,
} from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
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
  category: QuizCategory;
  subType: QuestionSubType;
  deliveryMode: DeliveryMode;
  selectionMethod: SelectionMethod;
  questionCount: number;
  questions?: Record<string, unknown>[];
  selectedQuestionIds?: string[];
};

// ─── QuizService ──────────────────────────────────────────────────────────────

export class QuizService {
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
      const questionWhere: Record<string, unknown> = {
        courseId,
        category: data.category,
        subType: data.subType,
      };
      if (
        data.selectionMethod === 'HAND_PICK' &&
        data.selectedQuestionIds?.length
      ) {
        questionWhere.id = { in: data.selectedQuestionIds };
      }

      const bankQuestions = await prisma.question.findMany({
        where: questionWhere,
        orderBy: { createdAt: 'desc' },
      });

      let selectedQuestions = bankQuestions;
      if (data.selectionMethod === 'RANDOM') {
        const shuffled = [...bankQuestions].sort(() => Math.random() - 0.5);
        selectedQuestions = shuffled.slice(0, data.questionCount);
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

    const quiz = await prisma.quiz.create({
      data: {
        courseId,
        title: data.title,
        description: data.description ?? null,
        category: data.category,
        subType: data.subType,
        deliveryMode: data.deliveryMode,
        selectionMethod: data.selectionMethod,
        questionCount:
          data.selectionMethod === 'MANUAL_CREATE'
            ? data.questionCount
            : selectedQuestionIds.length,
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

    return withLessonIds(quiz);
  }
  static async updateQuestions(
    quizId: string,
    userId: string,
    questions: Record<string, unknown>[],
    questionIds: Array<string | null>
  ) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        id: true,
        courseId: true,
        category: true,
        subType: true,
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
        const data = {
          prompt: getQuestionPrompt(questionData),
          answerData: questionData as Prisma.InputJsonValue,
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
              category: quiz.category,
              subType: quiz.subType,
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
        data: { questions: [], questionCount: persistedQuestionIds.length },
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
    if (currentQuestions.length >= fetchedQuiz.questionCount) {
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

    // 2. Generate the quiz from the lesson content
    const service = new OpenRouterService();
    const generated = await service.createQuiz({
      ...aiInput,
      quizType: fetchedQuiz.subType,
      context: aiInput.context
        ? `${aiInput.context}\n\n${lessonText}`
        : lessonText,
      questionNumbers: String(fetchedQuiz.questionCount),
      topic: aiInput.topic ?? lessons[0]?.title ?? undefined,
      content: lessonText || undefined,
    });
    // Normalize AI output into our internal schema (tolerant mapping)
    const safe = safeMapAIQuizToSchema(generated, fetchedQuiz.subType);
    const normalized = safe.success ? safe.data : null;

    const questionsToSave = normalized
      ? (normalized.questions as unknown[])
      : (generated.questions as unknown[]);

    // 3. Persist to the database (use normalized questions when available)
    const quiz = await prisma.$transaction(async (tx) => {
      const createdQuestions = await Promise.all(
        questionsToSave.map((question) =>
          tx.question.create({
            data: {
              courseId: fetchedQuiz.courseId,
              category: (normalized?.category ??
                generated.category) as QuizCategory,
              subType: (normalized?.subType ??
                generated.subType) as QuestionSubType,
              prompt: getQuestionPrompt(question as Record<string, unknown>),
              answerData: question as Prisma.InputJsonValue,
              explanation:
                typeof (question as Record<string, unknown>).explanation ===
                'string'
                  ? ((question as Record<string, unknown>)
                      .explanation as string)
                  : null,
            },
            select: { id: true },
          })
        )
      );

      await tx.quizQuestion.deleteMany({ where: { quizId } });
      if (createdQuestions.length > 0) {
        await tx.quizQuestion.createMany({
          data: createdQuestions.map(({ id: questionId }, orderIndex) => ({
            quizId,
            questionId,
            orderIndex,
          })),
        });
      }

      return tx.quiz.update({
        where: { id: quizId },
        data: {
          description: (normalized?.description ?? generated.description) as
            | string
            | null,
          category: (normalized?.category ??
            generated.category) as QuizCategory,
          subType: (normalized?.subType ??
            generated.subType) as QuestionSubType,
          deliveryMode: (normalized?.deliveryMode ??
            generated.deliveryMode) as DeliveryMode,
          selectionMethod: (normalized?.selectionMethod ??
            generated.selectionMethod) as SelectionMethod,
          questionCount: questionsToSave.length,
          questions: [],
        },
        include: quizRelations,
      });
    });

    return withLessonIds(quiz);
  }
}
