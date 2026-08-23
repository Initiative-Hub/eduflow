import type {
  GameQuizDraft,
  GameQuizQuestion,
  GeneratedGameQuizQuestion,
} from './types';

const optionLabels = ['A', 'B', 'C', 'D'];
export const MAX_GAME_QUIZ_QUESTIONS = 100;

export function createQuestion(order: number): GameQuizQuestion {
  const base = `draft-${crypto.randomUUID()}`;
  return {
    id: base,
    prompt: '',
    hint: '',
    explanation: '',
    timeLimitSeconds: 20,
    maxPoints: 1000,
    order,
    options: optionLabels.map((label, optionOrder) => ({
      id: `${base}-${label.toLowerCase()}`,
      text: '',
      isCorrect: optionOrder === 0,
      order: optionOrder,
    })),
  };
}

export function createDraft(): GameQuizDraft {
  return {
    title: '',
    topic: '',
    difficulty: 'MEDIUM',
    settings: {
      randomizeQuestions: false,
      randomizeAnswers: true,
    },
    questions: [createQuestion(0)],
  };
}

export function isPristineStarterQuestion(
  question: GameQuizQuestion | undefined
): boolean {
  return Boolean(
    question &&
      !question.prompt.trim() &&
      !question.hint?.trim() &&
      !question.explanation?.trim() &&
      question.timeLimitSeconds === 20 &&
      question.maxPoints === 1000 &&
      question.options.length === optionLabels.length &&
      question.options.every(
        (option, index) =>
          !option.text.trim() && option.isCorrect === (index === 0)
      )
  );
}

export function getAiQuestionCapacity(
  draft: GameQuizDraft,
  replacePristineStarter: boolean
): number {
  const replaceStarter =
    replacePristineStarter &&
    draft.questions.length === 1 &&
    isPristineStarterQuestion(draft.questions[0]);
  return Math.max(
    0,
    MAX_GAME_QUIZ_QUESTIONS - draft.questions.length + (replaceStarter ? 1 : 0)
  );
}

export function appendGeneratedQuestions(
  draft: GameQuizDraft,
  generatedQuestions: GeneratedGameQuizQuestion[],
  options: {
    replacePristineStarter: boolean;
    idFactory?: () => string;
  }
): {
  draft: GameQuizDraft;
  firstGeneratedIndex: number;
  appendedCount: number;
} {
  const idFactory = options.idFactory ?? (() => crypto.randomUUID());
  const replaceStarter =
    options.replacePristineStarter &&
    draft.questions.length === 1 &&
    isPristineStarterQuestion(draft.questions[0]);
  const existingQuestions = replaceStarter ? [] : draft.questions;
  const availableCapacity = Math.max(
    0,
    MAX_GAME_QUIZ_QUESTIONS - existingQuestions.length
  );
  const acceptedQuestions = generatedQuestions.slice(0, availableCapacity);
  const mappedQuestions = acceptedQuestions.map((question, questionIndex) => {
    const questionId = `draft-ai-${idFactory()}`;
    return {
      id: questionId,
      prompt: question.prompt,
      hint: question.hint,
      explanation: question.explanation,
      timeLimitSeconds: question.timerSeconds,
      maxPoints: question.maxPoints,
      order: existingQuestions.length + questionIndex,
      options: question.options.map((option, optionIndex) => ({
        id: `${questionId}-${optionIndex}`,
        text: option.text,
        isCorrect: option.isCorrect,
        order: optionIndex,
      })),
    } satisfies GameQuizQuestion;
  });

  if (mappedQuestions.length === 0) {
    return {
      draft,
      firstGeneratedIndex: Math.max(0, draft.questions.length - 1),
      appendedCount: 0,
    };
  }

  const questions = [...existingQuestions, ...mappedQuestions].map(
    (question, order) => ({ ...question, order })
  );
  return {
    draft: { ...draft, questions },
    firstGeneratedIndex: existingQuestions.length,
    appendedCount: mappedQuestions.length,
  };
}

export function isQuestionValid(question: GameQuizQuestion): boolean {
  return Boolean(
    question.prompt.trim() &&
      question.options.length >= 2 &&
      question.options.length <= 4 &&
      question.options.every((option) => option.text.trim()) &&
      question.options.filter((option) => option.isCorrect).length === 1 &&
      question.timeLimitSeconds >= 5 &&
      question.timeLimitSeconds <= 300 &&
      question.maxPoints > 0
  );
}

export function duplicateQuestion(
  draft: GameQuizDraft,
  questionIndex: number
): { draft: GameQuizDraft; newIndex: number } {
  const source = draft.questions[questionIndex];
  if (!source) return { draft, newIndex: questionIndex };

  const base = `draft-${crypto.randomUUID()}`;
  const duplicated: GameQuizQuestion = {
    ...source,
    id: base,
    order: questionIndex + 1,
    options: source.options.map((option, idx) => ({
      ...option,
      id: `${base}-${idx}`,
      order: idx,
    })),
  };

  const newQuestions = [...draft.questions];
  newQuestions.splice(questionIndex + 1, 0, duplicated);

  const reordered = newQuestions.map((q, idx) => ({
    ...q,
    order: idx,
  }));

  return {
    draft: { ...draft, questions: reordered },
    newIndex: questionIndex + 1,
  };
}

export function moveQuestion(
  draft: GameQuizDraft,
  fromIndex: number,
  toIndex: number
): { draft: GameQuizDraft; newIndex: number } {
  if (
    fromIndex < 0 ||
    fromIndex >= draft.questions.length ||
    toIndex < 0 ||
    toIndex >= draft.questions.length ||
    fromIndex === toIndex
  ) {
    return { draft, newIndex: fromIndex };
  }

  const updated = [...draft.questions];
  const [removed] = updated.splice(fromIndex, 1);
  if (!removed) return { draft, newIndex: fromIndex };
  updated.splice(toIndex, 0, removed);

  const reordered = updated.map((q, idx) => ({
    ...q,
    order: idx,
  }));

  return {
    draft: { ...draft, questions: reordered },
    newIndex: toIndex,
  };
}

export function isDraftValid(draft: GameQuizDraft) {
  return Boolean(
    draft.title.trim() &&
      draft.questions.length > 0 &&
      draft.questions.every(isQuestionValid)
  );
}

export function isGameQuizDraftDirty(
  draft: GameQuizDraft,
  originalDraft: GameQuizDraft | undefined
) {
  if (!originalDraft) return true;

  const persistableDraft = (value: GameQuizDraft) => ({
    title: value.title.trim(),
    topic: value.topic.trim() || null,
    difficulty: value.difficulty,
    settings: value.settings,
    questions: value.questions.map((question) => ({
      prompt: question.prompt.trim(),
      hint: question.hint?.trim() || null,
      explanation: question.explanation?.trim() || null,
      timeLimitSeconds: question.timeLimitSeconds,
      maxPoints: question.maxPoints,
      options: question.options.map((option) => ({
        text: option.text.trim(),
        isCorrect: option.isCorrect,
      })),
    })),
  });

  return (
    JSON.stringify(persistableDraft(draft)) !==
    JSON.stringify(persistableDraft(originalDraft))
  );
}
