import { describe, expect, it, vi } from 'vitest';
import {
  appendGeneratedQuestions,
  createDraft,
  getAiQuestionCapacity,
  isGameQuizDraftDirty,
  MAX_GAME_QUIZ_QUESTIONS,
} from '@/components/game-quiz/draft';
import {
  projectHostSession,
  projectParticipantSession,
} from '@/lib/game-quiz/projections';
import {
  gameQuizQuestionSchema,
  hostCommandSchema,
} from '@/lib/game-quiz/schemas';
import { calculateGamePoints } from '@/lib/game-quiz/scoring';
import {
  nextHostedGamePhase,
  shouldAutoRevealGameRound,
} from '@/lib/game-quiz/shared';
import { shuffle } from '@/lib/game-quiz/shuffle';
import type { SessionWithGameData } from '@/lib/game-quiz/types';
import { buildGameSessionReport } from '@/services/GameQuizAnswerService';

describe('Live Game Quiz rules', () => {
  it('groups reveal answerers by option for hosts but not participants', async () => {
    const participants = ['Sam Rivera', 'Alex Kim', 'Jo Lee'].map(
      (displayName, index) => ({
        id: `participant-${index + 1}`,
        realtimeKey: `participant-key-${index + 1}`,
        sessionId: 'session-1',
        userId: `user-${index + 1}`,
        displayName,
        score: 0,
        joinedAt: new Date('2026-08-09T10:00:00.000Z'),
        lastSeenAt: null,
        user: {
          id: `user-${index + 1}`,
          name: displayName,
          image: index === 0 ? 'https://example.com/sam.png' : null,
        },
      })
    );
    const session = {
      id: 'session-1',
      realtimeKey: 'session-key',
      gameQuizId: 'quiz-1',
      hostId: 'host-1',
      gameQuizRevision: 1,
      templateKey: 'LIVE_QUIZ_RALLY',
      title: 'Planet Rally',
      topic: null,
      difficulty: 'MEDIUM',
      joinCode: '123456',
      phase: 'REVEAL',
      currentRoundIndex: 0,
      joiningLocked: true,
      randomizeQuestionOrder: false,
      randomizeAnswerOrder: false,
      stateVersion: 2,
      startedAt: null,
      endedAt: null,
      lastHostSeenAt: null,
      closedReason: null,
      joinCodeReleasedAt: null,
      createdAt: new Date('2026-08-09T10:00:00.000Z'),
      updatedAt: new Date('2026-08-09T10:00:00.000Z'),
      participants,
      rounds: [
        {
          id: 'round-1',
          sessionId: 'session-1',
          sourceQuestionId: null,
          orderIndex: 0,
          prompt: 'Which planet is red?',
          hint: null,
          explanation: null,
          timerSeconds: 20,
          maxPoints: 1000,
          openedAt: null,
          deadlineAt: null,
          revealedAt: new Date(),
          options: [
            {
              id: 'mars',
              roundId: 'round-1',
              sourceOptionId: null,
              orderIndex: 0,
              text: 'Mars',
              isCorrect: true,
            },
            {
              id: 'venus',
              roundId: 'round-1',
              sourceOptionId: null,
              orderIndex: 1,
              text: 'Venus',
              isCorrect: false,
            },
          ],
        },
      ],
      answers: participants.map((participant, index) => ({
        id: `answer-${index}`,
        sessionId: 'session-1',
        participantId: participant.id,
        roundId: 'round-1',
        selectedOptionId: index < 2 ? 'mars' : 'venus',
        idempotencyKey: `key-${index}`,
        submittedAt: new Date(),
        responseTimeMs: 100,
        isCorrect: index < 2,
        pointsAwarded: 0,
      })),
    } satisfies SessionWithGameData;

    const host = await projectHostSession(session);
    const player = await projectParticipantSession(session, participants[0]!);

    expect(host.currentRound?.options).toMatchObject([
      {
        id: 'mars',
        answerCount: 2,
        answerers: [
          {
            id: 'participant-1',
            displayName: 'Sam Rivera',
            image: 'https://example.com/sam.png',
          },
          { id: 'participant-2', displayName: 'Alex Kim', image: null },
        ],
      },
      {
        id: 'venus',
        answerCount: 1,
        answerers: [
          { id: 'participant-3', displayName: 'Jo Lee', image: null },
        ],
      },
    ]);
    expect(
      player.currentRound?.options.every((option) => !('answerers' in option))
    ).toBe(true);
  });

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

  it('accepts end-game but rejects retired end-session host commands', () => {
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
    ).toBe(false);
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
      phase: 'FINAL_CELEBRATION',
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

  it('replaces only the pristine starter when accepting generated questions', () => {
    const generated = [
      {
        prompt: 'Which planet is known as the Red Planet?',
        hint: 'Think about its surface color.',
        explanation: 'Iron oxides make Mars appear red.',
        timerSeconds: 25,
        maxPoints: 1200,
        options: [
          { text: 'Mars', isCorrect: true },
          { text: 'Venus', isCorrect: false },
        ],
      },
    ];
    const pristineResult = appendGeneratedQuestions(createDraft(), generated, {
      replacePristineStarter: true,
      idFactory: () => 'generated-1',
    });

    expect(pristineResult.firstGeneratedIndex).toBe(0);
    expect(pristineResult.appendedCount).toBe(1);
    expect(pristineResult.draft.questions).toEqual([
      expect.objectContaining({
        id: 'draft-ai-generated-1',
        order: 0,
        prompt: generated[0]?.prompt,
        hint: generated[0]?.hint,
        explanation: generated[0]?.explanation,
        timeLimitSeconds: 25,
        maxPoints: 1200,
      }),
    ]);

    const editedDraft = createDraft();
    editedDraft.questions[0] = {
      ...editedDraft.questions[0]!,
      prompt: 'Keep this question',
    };
    const appendedResult = appendGeneratedQuestions(editedDraft, generated, {
      replacePristineStarter: true,
      idFactory: () => 'generated-2',
    });

    expect(appendedResult.firstGeneratedIndex).toBe(1);
    expect(appendedResult.draft.questions.map(({ prompt }) => prompt)).toEqual([
      'Keep this question',
      generated[0]?.prompt,
    ]);
    expect(appendedResult.draft.questions.map(({ order }) => order)).toEqual([
      0, 1,
    ]);
  });

  it('never accepts generated questions beyond the 100-question limit', () => {
    const draft = createDraft();
    draft.questions = Array.from(
      { length: MAX_GAME_QUIZ_QUESTIONS },
      (_, index) => ({
        ...draft.questions[0]!,
        id: `question-${index}`,
        prompt: `Question ${index + 1}`,
        order: index,
      })
    );

    expect(getAiQuestionCapacity(draft, false)).toBe(0);
    const result = appendGeneratedQuestions(
      draft,
      [
        {
          prompt: 'Overflow',
          hint: 'Hint',
          explanation: 'Explanation',
          timerSeconds: 20,
          maxPoints: 1000,
          options: [
            { text: 'A', isCorrect: true },
            { text: 'B', isCorrect: false },
          ],
        },
      ],
      { replacePristineStarter: false }
    );

    expect(result.appendedCount).toBe(0);
    expect(result.draft).toBe(draft);
    expect(result.draft.questions).toHaveLength(MAX_GAME_QUIZ_QUESTIONS);
  });
});
