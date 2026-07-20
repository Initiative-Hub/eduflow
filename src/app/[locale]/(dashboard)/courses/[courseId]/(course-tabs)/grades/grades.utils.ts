import type { StudentGradeAttempt } from './grades.types';

export interface LatestGradeAttempt {
  attempt: StudentGradeAttempt;
  attemptCount: number;
}

export function getLatestGradeAttemptsByQuiz(
  attempts: StudentGradeAttempt[]
): LatestGradeAttempt[] {
  const grouped = new Map<string, LatestGradeAttempt>();

  for (const attempt of attempts) {
    const existing = grouped.get(attempt.quizId);
    if (!existing) {
      grouped.set(attempt.quizId, { attempt, attemptCount: 1 });
      continue;
    }

    existing.attemptCount += 1;
    if (new Date(attempt.createdAt) > new Date(existing.attempt.createdAt)) {
      existing.attempt = attempt;
    }
  }

  return Array.from(grouped.values()).toSorted(
    (left, right) =>
      new Date(right.attempt.createdAt).getTime() -
      new Date(left.attempt.createdAt).getTime()
  );
}
