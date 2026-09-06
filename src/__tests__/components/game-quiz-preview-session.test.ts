import { describe, expect, it } from 'vitest';
import { createGameQuizPreviewSession } from '@/components/game-quiz/preview/game-quiz-preview-session';
import type { GameQuizQuestion } from '@/components/game-quiz/types';

const question: GameQuizQuestion = {
  id: 'question-1',
  prompt: 'Which planet is red?',
  hint: null,
  explanation: 'Mars has iron oxide on its surface.',
  timeLimitSeconds: 20,
  maxPoints: 1000,
  order: 0,
  options: [
    { id: 'mars', text: 'Mars', isCorrect: true, order: 0 },
    { id: 'venus', text: 'Venus', isCorrect: false, order: 1 },
    { id: 'earth', text: 'Earth', isCorrect: false, order: 2 },
    { id: 'jupiter', text: 'Jupiter', isCorrect: false, order: 3 },
  ],
};

function createPreviewSession(questionToPreview = question) {
  return createGameQuizPreviewSession({
    gameQuizId: 'quiz-1',
    gameTitle: 'Planet quiz',
    participantName: 'Preview player',
    participantRank: 4,
    phase: 'SCOREBOARD',
    question: questionToPreview,
    questionIndex: 0,
    totalRounds: 1,
  });
}

describe('createGameQuizPreviewSession', () => {
  it('assigns each preview participant to exactly one answer option', () => {
    const session = createPreviewSession();
    const answererIds = session.currentRound?.options.flatMap((option) =>
      (option.answerers ?? []).map((answerer) => answerer.id)
    );

    expect(answererIds).toHaveLength(6);
    expect(new Set(answererIds).size).toBe(6);
  });

  it('assigns every preview participant when a question has two options', () => {
    const session = createPreviewSession({
      ...question,
      options: question.options.slice(0, 2),
    });
    const answererIds = session.currentRound?.options.flatMap((option) =>
      (option.answerers ?? []).map((answerer) => answerer.id)
    );

    expect(answererIds).toHaveLength(6);
    expect(new Set(answererIds).size).toBe(6);
  });

  it('provides representative question statistics for the host scoreboard', () => {
    const session = createPreviewSession();

    expect(session.currentRound?.statistics).toEqual({
      responseCount: 6,
      correctCount: 3,
      averageResponseTimeMs: 7400,
    });
  });
});
