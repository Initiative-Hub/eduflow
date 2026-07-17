import { describe, expect, it } from 'vitest';
import { getLatestGradeAttemptsByQuiz } from '@/app/[locale]/(dashboard)/courses/[courseId]/(course-tabs)/grades/grades.utils';
import type { StudentGradeAttempt } from '@/app/[locale]/(dashboard)/courses/[courseId]/(course-tabs)/grades/grades.types';

function createAttempt(
  id: string,
  quizId: string,
  createdAt: string
): StudentGradeAttempt {
  return {
    id,
    quizId,
    quizSnapshot: {
      title: `Quiz ${quizId}`,
      description: '',
      type: 'mixed',
      deliveryMode: 'INSTANT_FEEDBACK',
      questions: [],
    },
    answers: {},
    score: 0,
    maxScore: 1,
    percentage: 0,
    results: [],
    answeredCount: 0,
    hasPendingReview: false,
    isLegacySnapshot: false,
    createdAt,
    updatedAt: createdAt,
  };
}

describe('getLatestGradeAttemptsByQuiz', () => {
  it('keeps only the newest attempt per quiz and records attempt counts', () => {
    const latest = getLatestGradeAttemptsByQuiz([
      createAttempt('old-a', 'quiz-a', '2026-07-01T00:00:00.000Z'),
      createAttempt('only-b', 'quiz-b', '2026-07-03T00:00:00.000Z'),
      createAttempt('new-a', 'quiz-a', '2026-07-04T00:00:00.000Z'),
    ]);

    expect(latest).toHaveLength(2);
    expect(latest.map((entry) => entry.attempt.id)).toEqual([
      'new-a',
      'only-b',
    ]);
    expect(latest.map((entry) => entry.attemptCount)).toEqual([2, 1]);
  });
});
