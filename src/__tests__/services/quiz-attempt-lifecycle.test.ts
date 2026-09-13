import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { QuizAttempt } from '@/generated/prisma';
import { QuizAttemptService } from '@/services/QuizAttemptService';
import {
  presentAttempt,
  scoreAttempt,
  validateProgress,
} from '@/services/quiz-attempt-data';

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  findUniqueOrThrow: vi.fn(),
  updateMany: vi.fn(),
  create: vi.fn(),
  enrollment: vi.fn(),
}));
vi.mock('@/lib/prisma', () => {
  const prisma = {
    quizAttempt: mocks,
    quiz: { findUnique: mocks.findUnique },
    enrollment: { findFirst: mocks.enrollment },
    $transaction: (fn: (tx: unknown) => unknown) => fn(prisma),
  };
  return { prisma };
});
const snapshot = {
  title: 'Original',
  description: '',
  type: 'true_false',
  deliveryMode: 'INSTANT_FEEDBACK' as const,
  questions: [
    {
      type: 'true_false' as const,
      prompt: 'Original question',
      correctAnswer: true,
      explanation: 'Original explanation',
    },
  ],
};
function fixture() {
  return {
    id: 'attempt',
    quizId: 'quiz',
    userId: 'owner',
    status: 'IN_PROGRESS' as const,
    revision: 0,
    answers: {},
    currentQuestionIndex: 0,
    checkedQuestionIndices: [],
    quizSnapshot: structuredClone(snapshot),
    startedAt: new Date(),
    completedAt: null,
    completionReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    answeredCount: 0,
    score: null,
    maxScore: null,
    percentage: null,
    results: null,
    hasPendingReview: false,
    quiz: {
      courseId: 'course',
      course: {
        id: 'course',
        title: 'Course',
        ownerId: 'owner',
        deletedAt: null,
      },
    },
  };
}

describe('course attempt lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enrollment.mockResolvedValue({ id: 'enrollment' });
  });
  it('does not expose answer keys until checked or completed', () => {
    const attempt = fixture();
    const view = presentAttempt(attempt as QuizAttempt);
    expect(view.quiz.questions[0]).not.toHaveProperty('correctAnswer');
    expect(view.reviewQuestions).toEqual({});
    expect(
      presentAttempt({ ...attempt, checkedQuestionIndices: [0] } as QuizAttempt)
        .reviewQuestions[0]
    ).toHaveProperty('correctAnswer', true);
  });
  it('locks checked answers and rejects mismatched question types', () => {
    const answer = { type: 'true_false' as const, selectedAnswer: true };
    const attempt = {
      ...fixture(),
      answers: { 0: answer },
      checkedQuestionIndices: [0],
    } as QuizAttempt;
    expect(() =>
      validateProgress(attempt, { 0: { ...answer, selectedAnswer: false } }, 0)
    ).toThrow('checked answer');
    expect(() => validateProgress(attempt, {}, 0)).toThrow('checked answer');
    expect(() =>
      validateProgress(
        fixture() as QuizAttempt,
        { 0: { type: 'essay', text: 'invalid' } },
        0
      )
    ).toThrow('does not match');
  });
  it('scores the frozen questions, preserving unanswered results', () => {
    const result = scoreAttempt(snapshot, {
      0: { type: 'true_false', selectedAnswer: true },
    });
    expect(result.percentage).toBe(100);
    expect(scoreAttempt(snapshot, {}).earnedPoints).toBe(0);
  });
  it('rejects stale progress before writing', async () => {
    mocks.findFirst.mockResolvedValue({ ...fixture(), revision: 2 });
    await expect(
      QuizAttemptService.save('owner', 'attempt', {
        revision: 0,
        currentQuestionIndex: 0,
        answers: {},
      })
    ).rejects.toMatchObject({ status: 409 });
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });
  it('does not disclose another user’s attempt', async () => {
    mocks.findFirst.mockResolvedValue(null);
    await expect(
      QuizAttemptService.get('outsider', 'attempt')
    ).rejects.toMatchObject({ status: 404 });
    expect(mocks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'attempt', userId: 'outsider' } })
    );
  });
  it('ends an owned attempt after access is revoked and returns the same completed result on retry', async () => {
    const original = {
      ...fixture(),
      quiz: {
        courseId: 'course',
        course: {
          id: 'course',
          title: 'Course',
          ownerId: 'other',
          deletedAt: null,
        },
      },
    };
    const completed = {
      ...original,
      status: 'COMPLETED',
      completedAt: new Date(),
      completionReason: 'ENDED_EARLY',
      score: 0,
      maxScore: 10,
      percentage: 0,
      results: [],
    };
    mocks.findFirst
      .mockResolvedValueOnce(original)
      .mockResolvedValueOnce(completed);
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.findUniqueOrThrow.mockResolvedValue(completed);
    const first = await QuizAttemptService.complete('owner', 'attempt', {
      revision: 0,
      completionReason: 'ENDED_EARLY',
    });
    const retry = await QuizAttemptService.complete('owner', 'attempt', {
      revision: 0,
      completionReason: 'ENDED_EARLY',
    });
    expect(first.result).toEqual(retry.result);
    expect(mocks.updateMany).toHaveBeenCalledTimes(1);
    expect(mocks.enrollment).not.toHaveBeenCalled();
  });

  it('requires complete and checked answers for normal submission', async () => {
    mocks.findFirst.mockResolvedValue(fixture());
    await expect(
      QuizAttemptService.complete('owner', 'attempt', {
        revision: 0,
        completionReason: 'SUBMITTED',
      })
    ).rejects.toMatchObject({ code: 'INCOMPLETE_ATTEMPT', status: 400 });

    mocks.findFirst.mockResolvedValue({
      ...fixture(),
      answers: { 0: { type: 'true_false', selectedAnswer: true } },
    });
    await expect(
      QuizAttemptService.complete('owner', 'attempt', {
        revision: 0,
        completionReason: 'SUBMITTED',
      })
    ).rejects.toMatchObject({ code: 'UNCHECKED_ANSWERS', status: 400 });
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });
});
