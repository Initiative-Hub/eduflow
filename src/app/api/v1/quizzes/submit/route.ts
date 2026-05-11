import { NextResponse } from 'next/server';
import { z } from 'zod';
import { calculateScore } from '@/lib/quiz-template/scoring';
import type {
  QuestionBlock,
  QuizSchema,
  StudentAnswer,
  StudentAnswers,
} from '@/lib/quiz-template/types';

// ─── Request Validation Schemas ──────────────────────────────────────────────

const multipleChoiceAnswerSchema = z.object({
  type: z.literal('multiple-choice'),
  selectedOptionId: z.string(),
});

const trueFalseAnswerSchema = z.object({
  type: z.literal('true-false'),
  selectedAnswer: z.boolean(),
});

const fillInTheBlankAnswerSchema = z.object({
  type: z.literal('fill-in-the-blank'),
  filledBlanks: z.record(z.string(), z.string()),
});

const matchingPairSchema = z.object({
  leftId: z.string(),
  rightId: z.string(),
});

const matchingAnswerSchema = z.object({
  type: z.literal('matching'),
  pairs: z.array(matchingPairSchema),
});

const orderingAnswerSchema = z.object({
  type: z.literal('ordering'),
  orderedItemIds: z.array(z.string()),
});

const dragAndDropAnswerSchema = z.object({
  type: z.literal('drag-and-drop'),
  placements: z.record(z.string(), z.string()),
});

const essayAnswerSchema = z.object({
  type: z.literal('essay'),
  text: z.string(),
  attachments: z.array(z.string()).optional(),
  teacherRubricText: z.string().optional(),
  teacherRubricAttachments: z.array(z.string()).optional(),
});

const studentAnswerSchema = z.discriminatedUnion('type', [
  multipleChoiceAnswerSchema,
  trueFalseAnswerSchema,
  fillInTheBlankAnswerSchema,
  matchingAnswerSchema,
  orderingAnswerSchema,
  dragAndDropAnswerSchema,
  essayAnswerSchema,
]);

const submitQuizSchema = z.object({
  /** The quiz questions with full answer data (server-side source of truth) */
  quizId: z.string().optional(),
  /** Quiz type identifier */
  quizType: z.string(),
  /** The full question blocks (with answers) — sourced from server/DB */
  questions: z.array(z.any()),
  /** Student answers keyed by question index */
  answers: z.record(z.string(), studentAnswerSchema),
  /** Points per question */
  pointsPerQuestion: z.number().positive().default(10),
});

// ─── Route Handler ───────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/quizzes/submit:
 *   post:
 *     tags:
 *       - Quizzes
 *     summary: Submit quiz answers for server-side scoring
 *     description: |
 *       Receives student answers and scores them against the authoritative
 *       question data on the server. This prevents client-side score manipulation.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quizType, questions, answers]
 *             properties:
 *               quizId:
 *                 type: string
 *                 description: Optional quiz ID for database-backed quizzes
 *               quizType:
 *                 type: string
 *               questions:
 *                 type: array
 *                 description: Full question blocks with answer data
 *               answers:
 *                 type: object
 *                 description: Student answers keyed by question index
 *               pointsPerQuestion:
 *                 type: number
 *                 default: 10
 *     responses:
 *       200:
 *         description: Score result
 *       400:
 *         description: Invalid request payload
 *       500:
 *         description: Internal server error
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = submitQuizSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid submission data', errors: parsed.error.format() },
        { status: 400 }
      );
    }

    const { quizType, questions, answers, pointsPerQuestion } = parsed.data;

    // Convert the answers record (string keys) to a Map (number keys)
    const studentAnswers: StudentAnswers = new Map();
    for (const [indexStr, answer] of Object.entries(answers)) {
      const index = Number.parseInt(indexStr, 10);
      if (!Number.isNaN(index)) {
        studentAnswers.set(index, answer as StudentAnswer);
      }
    }

    // Build the quiz schema for scoring
    const schema: QuizSchema = {
      type: quizType,
      constraints: { minQuestions: 1, maxQuestions: 100 },
      scoring: { pointsPerQuestion },
      questions: questions as QuestionBlock[],
    };

    // Score on the server using the authoritative question data
    const scoreResult = calculateScore(studentAnswers, schema);

    // Return score result along with the full questions (including answers)
    // so the client can render the result review with correct/incorrect indicators
    return NextResponse.json({
      ...scoreResult,
      reviewQuestions: questions as QuestionBlock[],
    });
  } catch (error: any) {
    console.error('Quiz submission error:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
