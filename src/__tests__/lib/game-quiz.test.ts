import { describe, expect, it, vi } from 'vitest';
import {
  appendGeneratedQuestions,
  createDraft,
  getAiQuestionCapacity,
  isGameQuizDraftDirty,
  MAX_GAME_QUIZ_QUESTIONS,
} from '@/components/game-quiz/draft';
import { gameQuizQuestionSchema } from '@/lib/game-quiz/schemas';
import { calculateGamePoints } from '@/lib/game-quiz/scoring';
import { shuffle } from '@/lib/game-quiz/shuffle';
import { buildGameSessionReport } from '@/services/GameQuizAnswerService';

const generatedQuestion = {
  prompt: 'Which planet is known as the Red Planet?',
  hint: 'Think about its surface color.',
  explanation: 'Iron oxides make Mars appear red.',
  timerSeconds: 25,
  maxPoints: 1200,
  options: [
    { text: 'Mars', isCorrect: true },
    { text: 'Venus', isCorrect: false },
  ],
};

describe('Game Quiz rules', () => {
  it('requires two to four options with exactly one correct answer', () => {
    expect(gameQuizQuestionSchema.safeParse(generatedQuestion).success).toBe(
      true
    );
    expect(
      gameQuizQuestionSchema.safeParse({
        ...generatedQuestion,
        options: generatedQuestion.options.map((option) => ({
          ...option,
          isCorrect: false,
        })),
      }).success
    ).toBe(false);
  });

  it('awards points only within the response deadline', () => {
    expect(calculateGamePoints(1000, 0, 20, true)).toBe(1000);
    expect(calculateGamePoints(1000, 10_000, 20, true)).toBe(750);
    expect(calculateGamePoints(1000, 20_000, 20, true)).toBe(0);
    expect(calculateGamePoints(1000, 500, 20, false)).toBe(0);
  });

  it('serializes finalized report statistics', () => {
    const report = buildGameSessionReport({
      id: 'session-1',
      gameQuizId: 'quiz-1',
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

    expect(report.session.completedAt).toBe('2026-08-09T10:05:00.000Z');
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

  it('returns a shuffled copy without mutating the source', () => {
    const source = ['a', 'b', 'c', 'd'];
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(shuffle(source)).toEqual(['b', 'c', 'd', 'a']);
    expect(source).toEqual(['a', 'b', 'c', 'd']);
    vi.restoreAllMocks();
  });

  it('ignores editor-only ids when comparing persisted drafts', () => {
    const original = createDraft();
    const changedIds = {
      ...original,
      questions: original.questions.map((question) => ({
        ...question,
        id: 'replacement-question-id',
        options: question.options.map((option, index) => ({
          ...option,
          id: `replacement-option-${index}`,
        })),
      })),
    };
    expect(isGameQuizDraftDirty(changedIds, original)).toBe(false);
  });

  it('replaces the pristine starter with generated questions', () => {
    const result = appendGeneratedQuestions(
      createDraft(),
      [generatedQuestion],
      {
        replacePristineStarter: true,
        idFactory: () => 'generated-1',
      }
    );
    expect(result.firstGeneratedIndex).toBe(0);
    expect(result.appendedCount).toBe(1);
    expect(result.draft.questions[0]).toMatchObject({
      id: 'draft-ai-generated-1',
      prompt: generatedQuestion.prompt,
    });
  });

  it('does not exceed the 100-question limit', () => {
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
    expect(
      appendGeneratedQuestions(draft, [generatedQuestion], {
        replacePristineStarter: false,
      }).appendedCount
    ).toBe(0);
  });
});
