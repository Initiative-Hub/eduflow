import { describe, expect, it, vi } from 'vitest';
import { isGameQuizDraftDirty } from '@/components/game-quiz/draft';
import { gameQuizQuestionSchema } from '@/lib/game-quiz/schemas';
import { calculateGamePoints } from '@/lib/game-quiz/scoring';
import { shuffle } from '@/lib/game-quiz/shuffle';

describe('Live Game Quiz rules', () => {
  it('requires two to four options with exactly one correct answer', () => {
    const validQuestion = {
      prompt: 'Which planet is known as the Red Planet?',
      hint: null,
      explanation: null,
      timerSeconds: 30,
      maxPoints: 1000,
      options: [
        { text: 'Mars', isCorrect: true },
        { text: 'Venus', isCorrect: false },
      ],
    };

    expect(gameQuizQuestionSchema.safeParse(validQuestion).success).toBe(true);
    expect(
      gameQuizQuestionSchema.safeParse({
        ...validQuestion,
        options: validQuestion.options.map((option) => ({
          ...option,
          isCorrect: false,
        })),
      }).success
    ).toBe(false);
    expect(
      gameQuizQuestionSchema.safeParse({
        ...validQuestion,
        timerSeconds: 301,
      }).success
    ).toBe(false);
  });

  it('awards only game points within the response deadline', () => {
    expect(calculateGamePoints(1000, 0, 20, true)).toBe(1000);
    expect(calculateGamePoints(1000, 10_000, 20, true)).toBe(750);
    expect(calculateGamePoints(1000, 19_999, 20, true)).toBe(500);
    expect(calculateGamePoints(1000, 20_000, 20, true)).toBe(0);
    expect(calculateGamePoints(1000, 500, 20, false)).toBe(0);
  });

  it('returns a new shuffled order without mutating the source', () => {
    const source = ['a', 'b', 'c', 'd'];
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const result = shuffle(source);

    expect(result).toEqual(['b', 'c', 'd', 'a']);
    expect(source).toEqual(['a', 'b', 'c', 'd']);
    vi.restoreAllMocks();
  });

  it('tracks persisted draft changes without considering editor-only ids', () => {
    const original = {
      title: 'Planet Rally',
      topic: '',
      difficulty: 'MEDIUM' as const,
      revision: 2,
      settings: {
        randomizeQuestions: false,
        randomizeAnswers: true,
        leaderboardEnabled: false,
      },
      questions: [
        {
          id: 'question-original',
          order: 0,
          prompt: 'Which planet is red?',
          hint: null,
          explanation: null,
          timeLimitSeconds: 20,
          maxPoints: 1000,
          options: [
            { id: 'option-a', order: 0, text: 'Mars', isCorrect: true },
            { id: 'option-b', order: 1, text: 'Venus', isCorrect: false },
          ],
        },
      ],
    };

    expect(
      isGameQuizDraftDirty(
        {
          ...original,
          questions: original.questions.map((question) => ({
            ...question,
            id: 'question-draft',
            hint: '',
            explanation: '',
            options: question.options.map((option, index) => ({
              ...option,
              id: `draft-option-${index}`,
            })),
          })),
        },
        original
      )
    ).toBe(false);

    expect(
      isGameQuizDraftDirty(
        {
          ...original,
          questions: original.questions.map((question) => ({
            ...question,
            options: question.options.map((option, index) => ({
              ...option,
              isCorrect: index === 1,
            })),
          })),
        },
        original
      )
    ).toBe(true);
  });
});
