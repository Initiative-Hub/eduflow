import { apiClient } from '@/lib/api/api-client';
import type {
  GameParticipant,
  GameQuiz,
  GameQuizDraft,
  GameQuizOption,
  GameQuizQuestion,
  GameQuizReport,
  GameSessionPhase,
  GameSessionSnapshot,
} from './types';

type GameHostAction =
  | 'START'
  | 'SKIP'
  | 'NEXT'
  | 'SET_JOINING_LOCKED'
  | 'END_GAME'
  | 'END_SESSION';

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null;
}

function getRecord(value: unknown): RecordValue {
  return isRecord(value) ? value : {};
}

function getArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === 'number' ? value : fallback;
}

function booleanValue(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function toOption(value: unknown, order: number): GameQuizOption {
  const option = getRecord(value);
  return {
    id: stringValue(option.id),
    text: stringValue(option.text),
    isCorrect: booleanValue(option.isCorrect),
    order: numberValue(option.order ?? option.orderIndex, order),
    answerCount: numberValue(option.answerCount),
  };
}

function toQuestion(value: unknown, order: number): GameQuizQuestion {
  const question = getRecord(value);
  return {
    id: stringValue(question.id),
    prompt: stringValue(question.prompt),
    hint: stringValue(question.hint) || null,
    explanation: stringValue(question.explanation) || null,
    timeLimitSeconds: numberValue(
      question.timeLimitSeconds ?? question.timerSeconds,
      20
    ),
    maxPoints: numberValue(question.maxPoints, 1000),
    order: numberValue(question.order ?? question.orderIndex, order),
    options: getArray(question.options).map(toOption),
  };
}

function toSettings(value: RecordValue) {
  const nested = getRecord(value.settings);
  return {
    randomizeQuestions: booleanValue(
      nested.randomizeQuestions ?? value.randomizeQuestionOrder
    ),
    randomizeAnswers: booleanValue(
      nested.randomizeAnswers ?? value.randomizeAnswerOrder,
      true
    ),
  };
}

function toGameQuiz(value: unknown): GameQuiz {
  const game = getRecord(value);
  const questions = getArray(game.questions).map(toQuestion);
  return {
    id: stringValue(game.id),
    title: stringValue(game.title),
    topic: stringValue(game.topic),
    difficulty: stringValue(
      game.difficulty,
      'MEDIUM'
    ).toUpperCase() as GameQuiz['difficulty'],
    templateKey: 'LIVE_QUIZ_RALLY',
    revision: numberValue(game.revision, 1),
    updatedAt: stringValue(game.updatedAt, new Date(0).toISOString()),
    questionCount: numberValue(game.questionCount, questions.length),
    settings: toSettings(game),
    questions,
  };
}

function toParticipant(value: unknown): GameParticipant {
  const participant = getRecord(value);
  return {
    id: stringValue(participant.id),
    displayName: stringValue(participant.displayName),
    image: stringValue(participant.image) || null,
    score: numberValue(participant.score),
    isOnline: booleanValue(participant.isOnline, true),
    joinedAt: stringValue(participant.joinedAt) || undefined,
  };
}

function toSession(value: unknown): GameSessionSnapshot {
  const envelope = getRecord(value);
  const session = getRecord(envelope.session ?? value);
  const round = isRecord(session.currentRound)
    ? toQuestion(session.currentRound, numberValue(session.currentRoundIndex))
    : null;
  const participants = getArray(session.participants).map(toParticipant);
  const leaderboard = getArray(session.leaderboard).map(toParticipant);
  const answer = getRecord(session.myAnswer ?? session.answer);
  const rounds = getArray(session.rounds);

  return {
    id: stringValue(session.id),
    gameQuizId: stringValue(session.gameQuizId),
    gameTitle: stringValue(session.gameTitle ?? session.title),
    joinCode: stringValue(session.joinCode),
    joiningLocked: booleanValue(session.joiningLocked),
    phase: stringValue(session.phase, 'LOBBY') as GameSessionPhase,
    stateVersion: numberValue(session.stateVersion, 1),
    currentRound: round
      ? {
          ...round,
          openedAt:
            stringValue(getRecord(session.currentRound).openedAt) || null,
          deadlineAt:
            stringValue(getRecord(session.currentRound).deadlineAt) || null,
        }
      : null,
    currentRoundIndex: numberValue(session.currentRoundIndex, 0),
    totalRounds: numberValue(session.totalRounds, rounds.length),
    participant: isRecord(session.participant)
      ? toParticipant(session.participant)
      : null,
    participants,
    answerCount: numberValue(session.answerCount),
    leaderboard,
    myAnswer:
      answer.id || answer.selectedOptionId
        ? {
            optionId: stringValue(answer.optionId ?? answer.selectedOptionId),
            isCorrect:
              typeof answer.isCorrect === 'boolean'
                ? answer.isCorrect
                : undefined,
            pointsAwarded:
              typeof answer.pointsAwarded === 'number'
                ? answer.pointsAwarded
                : undefined,
          }
        : null,
  };
}

function toQuizSettings(draft: GameQuizDraft) {
  return {
    title: draft.title.trim(),
    topic: draft.topic.trim() || null,
    difficulty: draft.difficulty,
    randomizeQuestionOrder: draft.settings.randomizeQuestions,
    randomizeAnswerOrder: draft.settings.randomizeAnswers,
  };
}

function toQuestionPayload(draft: GameQuizDraft) {
  return draft.questions.map((question) => ({
    prompt: question.prompt.trim(),
    hint: question.hint?.trim() || null,
    explanation: question.explanation?.trim() || null,
    timerSeconds: question.timeLimitSeconds,
    maxPoints: question.maxPoints,
    options: question.options.map((option) => ({
      text: option.text.trim(),
      isCorrect: option.isCorrect,
    })),
  }));
}

export const gameQuizApi = {
  list: async () => {
    const response = await apiClient.get<unknown>('v1/game-quizzes');
    return getArray(response).map(toGameQuiz);
  },
  get: async (gameQuizId: string) =>
    toGameQuiz(await apiClient.get<unknown>(`v1/game-quizzes/${gameQuizId}`)),
  create: async (draft: Omit<GameQuizDraft, 'revision'>) => {
    const created = toGameQuiz(
      await apiClient.post<unknown>('v1/game-quizzes', toQuizSettings(draft))
    );
    return toGameQuiz(
      await apiClient.put<unknown>(`v1/game-quizzes/${created.id}/questions`, {
        expectedRevision: created.revision,
        settings: toQuizSettings(draft),
        questions: toQuestionPayload(draft),
      })
    );
  },
  saveQuestions: async (gameQuizId: string, draft: GameQuizDraft) =>
    toGameQuiz(
      await apiClient.put<unknown>(`v1/game-quizzes/${gameQuizId}/questions`, {
        expectedRevision: draft.revision,
        settings: toQuizSettings(draft),
        questions: toQuestionPayload(draft),
      })
    ),
  createSession: async (gameQuizId: string, expectedRevision: number) =>
    toSession(
      await apiClient.post<unknown>(`v1/game-quizzes/${gameQuizId}/sessions`, {
        expectedRevision,
      })
    ),
  getSession: async (sessionId: string) =>
    toSession(await apiClient.get<unknown>(`v1/game-sessions/${sessionId}`)),
  join: async (joinCode: string) => {
    const response = await apiClient.post<unknown>('v1/game-sessions/join', {
      joinCode,
    });
    const record = getRecord(response);
    const session = getRecord(record.session ?? response);
    return { sessionId: stringValue(record.sessionId ?? session.id) };
  },
  command: async (
    sessionId: string,
    action: GameHostAction,
    expectedStateVersion: number,
    joiningLocked?: boolean
  ) =>
    toSession(
      await apiClient.post<unknown>(`v1/game-sessions/${sessionId}/host`, {
        action,
        expectedStateVersion,
        ...(action === 'SET_JOINING_LOCKED' ? { joiningLocked } : {}),
      })
    ),
  submitAnswer: async (
    sessionId: string,
    roundId: string,
    selectedOptionId: string,
    idempotencyKey: string
  ) =>
    apiClient.post<unknown>(`v1/game-sessions/${sessionId}/answers`, {
      roundId,
      selectedOptionId,
      idempotencyKey,
    }),
  heartbeat: (sessionId: string) =>
    apiClient.post(`v1/game-sessions/${sessionId}/presence`, {}),
  answerProgress: (sessionId: string) =>
    apiClient.get<{
      answerCount: number;
      participantCount: number;
      pendingCount: number;
      roundId: string | null;
      sessionId: string;
      stateVersion: number;
    }>(`v1/game-sessions/${sessionId}/answer-progress`),
  report: (sessionId: string) =>
    apiClient.get<GameQuizReport>(`v1/game-sessions/${sessionId}/report`),
};

export type { GameHostAction };
