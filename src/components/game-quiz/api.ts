import { apiClient } from '@/lib/api/api-client';
import type {
  GameQuiz,
  GameQuizAiSourceCourse,
  GameQuizAiSourceLesson,
  GameQuizAiSourceModule,
  GameQuizAiSources,
  GameQuizDraft,
  GameQuizOption,
  GameQuizQuestion,
  GameQuizReport,
  GeneratedGameQuizQuestion,
  GenerateGameQuizQuestionsInput,
} from './types';

type GameHostAction =
  | 'START'
  | 'SKIP'
  | 'NEXT'
  | 'SET_JOINING_LOCKED'
  | 'END_GAME';

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
    answerers: getArray(option.answerers).filter(isRecord).map(toAnswerer),
  };
}

function toAnswerer(
  value: unknown
): NonNullable<GameQuizOption['answerers']>[number] {
  const answerer = getRecord(value);
  return {
    id: stringValue(answerer.id),
    displayName: stringValue(answerer.displayName),
    image: stringValue(answerer.image) || null,
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
    difficulty:
      typeof game.difficulty === 'string' && game.difficulty.trim()
        ? (game.difficulty.trim().toUpperCase() as NonNullable<
            GameQuiz['difficulty']
          >)
        : null,
    templateKey: 'LIVE_QUIZ_RALLY',
    revision: numberValue(game.revision, 1),
    updatedAt: stringValue(game.updatedAt, new Date(0).toISOString()),
    questionCount: numberValue(game.questionCount, questions.length),
    settings: toSettings(game),
    questions,
  };
}

function toAiSourceLesson(value: unknown): GameQuizAiSourceLesson {
  const lesson = getRecord(value);
  return {
    id: stringValue(lesson.id),
    title: stringValue(lesson.title),
  };
}

function toAiSourceModule(value: unknown): GameQuizAiSourceModule {
  const module = getRecord(value);
  return {
    id: stringValue(module.id),
    title: stringValue(module.title),
    lessons: getArray(module.lessons).map(toAiSourceLesson),
  };
}

function toAiSourceCourse(value: unknown): GameQuizAiSourceCourse {
  const course = getRecord(value);
  return {
    id: stringValue(course.id),
    title: stringValue(course.title),
    modules: getArray(course.modules).map(toAiSourceModule),
  };
}

function toGeneratedQuestion(value: unknown): GeneratedGameQuizQuestion {
  const question = getRecord(value);
  return {
    prompt: stringValue(question.prompt),
    hint: stringValue(question.hint),
    explanation: stringValue(question.explanation),
    timerSeconds: numberValue(
      question.timerSeconds ?? question.timeLimitSeconds,
      20
    ),
    maxPoints: numberValue(question.maxPoints, 1000),
    options: getArray(question.options).map((value) => {
      const option = getRecord(value);
      return {
        text: stringValue(option.text),
        isCorrect: booleanValue(option.isCorrect),
      };
    }),
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
  getAiSources: async (): Promise<GameQuizAiSources> => {
    const response = getRecord(
      await apiClient.get<unknown>('v1/ai/game-quiz/sources')
    );
    return {
      courses: getArray(response.courses).map(toAiSourceCourse),
    };
  },
  generateAiQuestions: async (input: GenerateGameQuizQuestionsInput) => {
    const response = getRecord(
      await apiClient.post<unknown>('v1/ai/game-quiz/questions', input)
    );
    return {
      questions: getArray(response.questions).map(toGeneratedQuestion),
    };
  },
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
  createSession: async (
    gameQuizId: string,
    expectedRevision: number,
    initializationKey: string
  ) => {
    const response = getRecord(
      await apiClient.post<unknown>(`v1/game-quizzes/${gameQuizId}/sessions`, {
        expectedRevision,
        initializationKey,
      })
    );
    return {
      sessionId: stringValue(response.sessionId),
    };
  },
  report: (gameQuizId: string, sessionId: string) =>
    apiClient.get<GameQuizReport | { status: 'PROCESSING' }>(
      `v1/game-quizzes/${gameQuizId}/live-game/report?sessionId=${encodeURIComponent(sessionId)}`
    ),
};

export type { GameHostAction };
