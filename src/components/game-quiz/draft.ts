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
