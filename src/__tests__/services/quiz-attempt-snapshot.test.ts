import { describe, expect, it } from 'vitest';
import {
  countAnsweredQuestions,
  createQuizAttemptSnapshot,
  getQuestionAttemptStatus,
} from '@/services/quiz-attempt-snapshot';

describe('quiz attempt snapshots', () => {
  it('captures quiz metadata and full authoritative questions at submission time', () => {
    const questions = [
      {
        type: 'true_false' as const,
        prompt: 'The Earth orbits the Sun.',
        correctAnswer: true,
      },
    ];

    expect(
      createQuizAttemptSnapshot(
        {
          title: 'Astronomy check',
          description: 'A short review',
          deliveryMode: 'INSTANT_FEEDBACK',
        },
        questions
      )
    ).toEqual({
      title: 'Astronomy check',
      description: 'A short review',
      type: 'true_false',
      deliveryMode: 'INSTANT_FEEDBACK',
      questions,
    });
  });

  it('counts only answers that belong to snapshot questions', () => {
    expect(
      countAnsweredQuestions(
        {
          0: { type: 'true_false', selectedAnswer: true },
          2: { type: 'true_false', selectedAnswer: false },
          9: { type: 'true_false', selectedAnswer: true },
          invalid: { type: 'true_false', selectedAnswer: true },
        },
        3
      )
    ).toBe(2);
  });

  it('distinguishes unanswered questions from incorrect answers', () => {
    expect(getQuestionAttemptStatus(undefined, undefined)).toBe('unanswered');
    expect(
      getQuestionAttemptStatus(
        { type: 'true_false', selectedAnswer: false },
        { questionIndex: 0, isCorrect: false, earnedPoints: 0, maxPoints: 10 }
      )
    ).toBe('incorrect');
  });
});
