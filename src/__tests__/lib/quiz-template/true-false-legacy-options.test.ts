import { describe, expect, it } from 'vitest';
import { calculateScore } from '@/lib/quiz-template/scoring';
import type { QuizSchema, StudentAnswers } from '@/lib/quiz-template/types';

describe('true/false legacy options compatibility', () => {
  it('scores correctly when true_false question uses options[].isCorrect', () => {
    const legacyQuestion = {
      type: 'true_false' as const,
      prompt:
        "PHP stands for 'Personal Home Page' historically, though it currently stands for 'PHP: Hypertext Preprocessor'.",
      options: [
        { id: 'opt1', text: 'True', isCorrect: true },
        { id: 'opt2', text: 'False', isCorrect: false },
      ],
      explanation:
        'This is correct; the acronym initially stood for Personal Home Page before evolving into a recursive acronym.',
    };

    const schema: QuizSchema = {
      type: 'quiz',
      constraints: { minQuestions: 1, maxQuestions: 1 },
      scoring: { pointsPerQuestion: 10 },
      questions: [legacyQuestion as any],
    };

    const answers: StudentAnswers = new Map([
      [0, { type: 'true-false', selectedAnswer: true }],
    ]);

    const result = calculateScore(answers, schema);

    expect(result.questionResults[0]?.isCorrect).toBe(true);
    expect(result.earnedPoints).toBe(10);
    expect(result.percentage).toBe(100);
  });
});
