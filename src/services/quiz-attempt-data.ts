import * as z from 'zod';
import type { QuizAttempt } from '@/generated/prisma';
import { calculateScore } from '@/lib/quiz-template/scoring';
import { stripQuizAnswers } from '@/lib/quiz-template/strip-answers';
import type { StudentAnswer } from '@/lib/quiz-template/types';
import { questionBlockSchema } from '@/lib/validations/quiz.schema';
import { studentAnswerSchema } from '@/lib/validations/quiz-attempt.schema';
import type { QuizAttemptSnapshot } from '@/utils/quiz-attempt-snapshot';

export class QuizAttemptError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

export const snapshotSchema = z.object({
  title: z.string(),
  description: z.string(),
  type: z.string(),
  deliveryMode: z.enum(['INSTANT_FEEDBACK', 'POST_QUIZ_REVIEW']),
  questions: z.array(questionBlockSchema).min(1),
});
export const answersSchema = z.record(z.string(), studentAnswerSchema);

export function scoreAttempt(
  snapshot: QuizAttemptSnapshot,
  answers: Record<string, StudentAnswer>
) {
  return calculateScore(
    new Map(
      Object.entries(answers).map(([index, answer]) => [Number(index), answer])
    ),
    {
      type: snapshot.type,
      questions: snapshot.questions,
      constraints: { minQuestions: 1, maxQuestions: 100 },
      scoring: { pointsPerQuestion: 10 },
    }
  );
}

export function validateProgress(
  attempt: QuizAttempt,
  answers: Record<string, StudentAnswer>,
  currentIndex: number
) {
  const snapshot = snapshotSchema.parse(attempt.quizSnapshot);
  if (currentIndex >= snapshot.questions.length)
    throw new QuizAttemptError(
      400,
      'INVALID_QUESTION',
      'Invalid question position.'
    );
  for (const [key, answer] of Object.entries(answers)) {
    const question = snapshot.questions[Number(key)];
    if (!question || question.type !== answer.type)
      throw new QuizAttemptError(
        400,
        'INVALID_ANSWER',
        'Answer does not match its question.'
      );
  }
  const saved = answersSchema.parse(attempt.answers);
  for (const index of attempt.checkedQuestionIndices) {
    // Compare validated answer objects, independent of object-key order.
    if (!equalAnswer(saved[index], answers[index]))
      throw new QuizAttemptError(
        409,
        'ANSWER_LOCKED',
        'A checked answer cannot be changed.'
      );
  }
  return snapshot;
}

function equalAnswer(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const x = Object.entries(a);
  const y = Object.entries(b);
  return (
    x.length === y.length &&
    x.every(
      ([key, value]) =>
        Object.hasOwn(b, key) &&
        equalAnswer(value, (b as Record<string, unknown>)[key])
    )
  );
}

export function assertActiveRevision(attempt: QuizAttempt, revision: number) {
  if (attempt.status !== 'IN_PROGRESS' || attempt.revision !== revision) {
    throw new QuizAttemptError(
      409,
      'ATTEMPT_CONFLICT',
      'This attempt changed elsewhere. Reload the saved attempt.'
    );
  }
}

export function presentAttempt(
  attempt: QuizAttempt,
  fallback?: QuizAttemptSnapshot
) {
  const snapshot = attempt.quizSnapshot
    ? snapshotSchema.parse(attempt.quizSnapshot)
    : fallback;
  if (!snapshot)
    throw new QuizAttemptError(
      404,
      'SNAPSHOT_UNAVAILABLE',
      'Quiz content is unavailable.'
    );
  const completed = attempt.status === 'COMPLETED';
  const answers = answersSchema.parse(attempt.answers);
  const quiz = completed ? snapshot : stripQuizAnswers(snapshot);
  const reviewQuestions = Object.fromEntries(
    attempt.checkedQuestionIndices.map((index) => [
      index,
      snapshot.questions[index],
    ])
  );
  return {
    id: attempt.id,
    quizId: attempt.quizId,
    status: attempt.status,
    quiz,
    deliveryMode: snapshot.deliveryMode,
    answers,
    currentQuestionIndex: attempt.currentQuestionIndex,
    checkedQuestionIndices: attempt.checkedQuestionIndices,
    reviewQuestions,
    revision: attempt.revision,
    startedAt: attempt.startedAt?.toISOString() ?? null,
    completedAt: attempt.completedAt?.toISOString() ?? null,
    completionReason: attempt.completionReason,
    answeredCount: attempt.answeredCount,
    isLegacySnapshot: attempt.quizSnapshot === null,
    result: completed
      ? {
          totalPoints: attempt.maxScore!,
          earnedPoints: attempt.score!,
          percentage: attempt.percentage!,
          questionResults: attempt.results as unknown as ReturnType<
            typeof scoreAttempt
          >['questionResults'],
          hasPendingReview: attempt.hasPendingReview,
        }
      : null,
  };
}
