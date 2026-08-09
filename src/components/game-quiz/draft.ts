import type { GameQuizDraft, GameQuizQuestion } from './types';

const optionLabels = ['A', 'B', 'C', 'D'];

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

export function isDraftValid(draft: GameQuizDraft) {
  return Boolean(
    draft.title.trim() &&
      draft.questions.length > 0 &&
      draft.questions.every(
        (question) =>
          question.prompt.trim() &&
          question.options.length >= 2 &&
          question.options.length <= 4 &&
          question.options.every((option) => option.text.trim()) &&
          question.options.filter((option) => option.isCorrect).length === 1 &&
          question.timeLimitSeconds >= 5 &&
          question.timeLimitSeconds <= 300 &&
          question.maxPoints > 0
      )
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
