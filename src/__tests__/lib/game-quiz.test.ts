import { describe, expect, it, vi } from 'vitest';
import { isGameQuizDraftDirty } from '@/components/game-quiz/draft';
import {
  gameQuizQuestionSchema,
  hostCommandSchema,
} from '@/lib/game-quiz/schemas';
import { calculateGamePoints } from '@/lib/game-quiz/scoring';
import { shuffle } from '@/lib/game-quiz/shuffle';
import { buildGameSessionReport } from '@/services/GameQuizAnswerService';
import {
  nextHostedGamePhase,
  shouldAutoRevealGameRound,
} from '@/lib/game-quiz/shared';

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

  it('uses the single Kahoot-style reveal and next flow', () => {
    const now = new Date('2026-08-09T10:00:00.000Z');
    expect(
      shouldAutoRevealGameRound({
        answerCount: 2,
        participantCount: 2,
        deadlineAt: new Date('2026-08-09T10:01:00.000Z'),
        now,
      })
    ).toBe(true);
    expect(
      shouldAutoRevealGameRound({
        answerCount: 0,
        participantCount: 2,
        deadlineAt: new Date('2026-08-09T09:59:59.000Z'),
        now,
      })
    ).toBe(true);
    expect(
      shouldAutoRevealGameRound({
        answerCount: 0,
        participantCount: 0,
        deadlineAt: new Date('2026-08-09T10:01:00.000Z'),
        now,
      })
    ).toBe(false);
    expect(nextHostedGamePhase('REVEAL', true)).toBe('SCOREBOARD');
    expect(nextHostedGamePhase('SCOREBOARD', true)).toBe('QUESTION_OPEN');
    expect(nextHostedGamePhase('SCOREBOARD', false)).toBe('FINAL_CELEBRATION');
  });

  it('accepts distinct end-game and end-session host commands', () => {
    expect(
      hostCommandSchema.safeParse({
        action: 'END_GAME',
        expectedStateVersion: 1,
      }).success
    ).toBe(true);
    expect(
      hostCommandSchema.safeParse({
        action: 'END_SESSION',
        expectedStateVersion: 1,
      }).success
    ).toBe(true);
    expect(
      hostCommandSchema.safeParse({
        action: 'END',
        expectedStateVersion: 1,
      }).success
    ).toBe(false);
  });

  it('serializes report rounds with client-safe order and response fields', () => {
    const report = buildGameSessionReport({
      id: 'session-1',
      title: 'Planet Rally',
      joinCode: '123456',
      phase: 'REPORT',
      createdAt: new Date('2026-08-09T10:00:00.000Z'),
      endedAt: new Date('2026-08-09T10:05:00.000Z'),
      rounds: [
        { id: 'round-1', orderIndex: 0, prompt: 'First question' },
        { id: 'round-2', orderIndex: 1, prompt: 'Second question' },
      ],
      participants: [{ id: 'participant-1', displayName: 'Sam', score: 854 }],
      answers: [
        {
          roundId: 'round-1',
          isCorrect: true,
          pointsAwarded: 854,
        },
      ],
    } as never);

    expect(report.session).toMatchObject({
      gameTitle: 'Planet Rally',
      completedAt: '2026-08-09T10:05:00.000Z',
    });
    expect(report.rounds).toEqual([
      expect.objectContaining({
        order: 0,
        responseCount: 1,
        correctCount: 1,
        averagePoints: 854,
      }),
      expect.objectContaining({
        order: 1,
        responseCount: 0,
        correctCount: 0,
        averagePoints: 0,
      }),
    ]);
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
