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
 * Converts a lesson's stored `content` field (Tiptap JSON, plain string, or null)
 * into a plain-text string suitable for the AI prompt.
 */
function lessonContentToText(content: unknown): string {
  if (!content) return '';
  if (typeof content === 'string') return content.trim();

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
        module: { courseId },
      },
      select: { id: true },
    });

    if (linkedLessons.length !== data.lessonIds.length) {
      throw new Error('Some lessons do not belong to this course');
    }

    let resolvedQuestions: unknown[] = data.questions ?? [];

    if (
      resolvedQuestions.length === 0 &&
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
      } else {
        selectedQuestions = bankQuestions.slice(0, data.questionCount);
      }

      resolvedQuestions = selectedQuestions.map((q) => {
        const answerData = q.answerData as Record<string, unknown>;
        if (q.explanation && !answerData.explanation) {
          return { ...answerData, explanation: q.explanation };
        }
        return answerData;
      });
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
        questionCount: data.questionCount,
        questions: resolvedQuestions as unknown as Prisma.InputJsonValue,
        lessons: { connect: data.lessonIds.map((id) => ({ id })) },
      },
      include: { lessons: true },
    });

    return quiz;
  }
  static async updateQuestions(
    quizId: string,
    questions: Record<string, unknown>[]
  ) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: { id: true },
    });

    if (!quiz) {
      throw new Error('Quiz not found');
    }

    return await prisma.quiz.update({
      where: { id: quizId },
      data: {
        questions: questions as unknown as Prisma.InputJsonValue,
        questionCount: questions.length,
      },
    });
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
    }
  ) {
    // 1. Fetch the lesson and extract its plain-text content
    // const lesson = await prisma.lesson.findUnique({
    //   where: { id: lessonId },
    //   select: { id: true, title: true, content: true },
    // });

    const fetchedQuiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        course: { select: { ownerId: true } },
        lessons: { select: { id: true, title: true, content: true } },
      },
    });
    if (!fetchedQuiz) {
      throw new Error('Quiz not found');
    }
    if (fetchedQuiz.course.ownerId !== userId) {
      throw new Error('Forbidden');
    }
    const currentQuestions = (fetchedQuiz.questions as unknown[]) ?? [];
    if (currentQuestions.length >= fetchedQuiz.questionCount) {
      throw new Error('Quiz already has the maximum number of questions');
    }
    // Aggregate content from all linked lessons
    const lessons = fetchedQuiz.lessons ?? [];
    if (!lessons || lessons.length === 0) {
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
      questionNumbers: String(fetchedQuiz.questionCount),
      topic: aiInput.topic ?? lessons[0]?.title ?? undefined,
      content: lessonText || undefined,
    });

    // 3. Persist to the database
    const quiz = await prisma.quiz.update({
      where: { id: quizId },
      data: {
        title: generated.title,
        description: generated.description,
        category: generated.category as QuizCategory,
        subType: generated.subType as QuestionSubType,
        deliveryMode: generated.deliveryMode as DeliveryMode,
        selectionMethod: generated.selectionMethod as SelectionMethod,
        questionCount: generated.questions.length,
        questions: generated.questions as unknown as Prisma.InputJsonValue,
      },
    });

    return quiz;
  }
}
