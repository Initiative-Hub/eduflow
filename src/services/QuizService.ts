import type {
  DeliveryMode,
  Prisma,
  QuestionSubType,
  QuizCategory,
  SelectionMethod,
} from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
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

// ─── QuizService ──────────────────────────────────────────────────────────────

export class QuizService {
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
   * Generates a quiz via AI using the lesson's own content, then saves it to the DB.
   *
   * @param courseId       - The course the quiz belongs to
   * @param lessonId       - The lesson to attach the quiz to (its content is used for generation)
   * @param aiInput        - Optional AI options (topic, apiKey, model).
   *                         Do NOT pass `content` — it is fetched from the lesson automatically.
   * @returns The newly created Quiz record
   */
  static async generateAndSave(
    quizId: string,
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

    const fetchedQuiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!fetchedQuiz) {
      throw new Error('Quiz not found');
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: fetchedQuiz.lessonId },
      select: { id: true, title: true, content: true },
    });
    if (!lesson) {
      throw new Error(`Lesson not found: ${fetchedQuiz.lessonId}`);
    }

    const lessonText = lessonContentToText(lesson.content);

    // 2. Generate the quiz from the lesson content
    const service = new OpenRouterService();
    const generated = await service.createQuiz({
      ...aiInput,
      quizType: fetchedQuiz.subType,
      questionNumbers: String(fetchedQuiz.questionCount),
      topic: aiInput.topic ?? lesson.title,
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
