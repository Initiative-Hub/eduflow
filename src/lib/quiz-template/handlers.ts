/**
 * Question Type Handler Registrations
 *
 * Registers all supported question types with their scoring and answer-stripping
 * functions. Import this module to ensure all handlers are registered.
 */

import { registerQuestionType } from './registry';
import type {
  ClientQuestionBlock,
  DragAndDropQuestion,
  EssayQuestion,
  FillInTheBlankQuestion,
  MatchingQuestion,
  MultipleChoiceQuestion,
  OrderingQuestion,
  QuestionBlock,
  StudentAnswer,
  TrueFalseQuestion,
} from './types';

// ─── Scoring Functions ───────────────────────────────────────────────────────

function scoreMultipleChoice(
  question: QuestionBlock,
  answer: StudentAnswer
): boolean {
  if (question.type !== 'multiple_choice' || answer.type !== 'multiple_choice')
    return false;

  const correctOption = question.options.find((option) => option.isCorrect);
  return correctOption?.id === answer.selectedOptionId;
}

function scoreTrueFalse(
  question: QuestionBlock,
  answer: StudentAnswer
): boolean {
  if (question.type !== 'true_false' || answer.type !== 'true_false')
    return false;

  return question.correctAnswer === answer.selectedAnswer;
}

function scoreFillInTheBlank(
  question: QuestionBlock,
  answer: StudentAnswer
): boolean {
  if (
    question.type !== 'fill_in_the_blank' ||
    answer.type !== 'fill_in_the_blank'
  )
    return false;

  return question.blanks.every((blank) => {
    const studentValue = answer.filledBlanks[blank.id];
    if (!studentValue) return false;
    return blank.acceptableAnswers.some(
      (acceptable) =>
        acceptable.toLowerCase().trim() === studentValue.toLowerCase().trim()
    );
  });
}

function scoreMatching(
  question: QuestionBlock,
  answer: StudentAnswer
): boolean {
  if (question.type !== 'matching' || answer.type !== 'matching') return false;
  if (answer.pairs.length !== question.correctPairs.length) return false;
  return question.correctPairs.every((cp) =>
    answer.pairs.some((p) => p.leftId === cp.leftId && p.rightId === cp.rightId)
  );
}

function scoreOrdering(
  question: QuestionBlock,
  answer: StudentAnswer
): boolean {
  if (question.type !== 'ordering' || answer.type !== 'ordering') return false;
  if (answer.orderedItemIds.length !== question.correctOrder.length)
    return false;
  return question.correctOrder.every(
    (id, index) => answer.orderedItemIds[index] === id
  );
}

function scoreDragAndDrop(
  question: QuestionBlock,
  answer: StudentAnswer
): boolean {
  if (question.type !== 'drag_and_drop' || answer.type !== 'drag_and_drop')
    return false;
  return question.zones.every(
    (zone) => answer.placements[zone.id] === question.correctMapping[zone.id]
  );
}

function scoreEssay(_question: QuestionBlock, _answer: StudentAnswer): boolean {
  // Essays are never auto-scored; handled separately as pendingReview
  return false;
}

// ─── Strip Functions ─────────────────────────────────────────────────────────

function stripMultipleChoice(question: QuestionBlock): ClientQuestionBlock {
  const q = question as MultipleChoiceQuestion;
  return {
    type: 'multiple_choice',
    prompt: q.prompt,
    options: q.options.map(({ id, text }) => ({ id, text })),
  };
}

function stripTrueFalse(question: QuestionBlock): ClientQuestionBlock {
  const q = question as TrueFalseQuestion;
  return {
    type: 'true_false',
    prompt: q.prompt,
  };
}

function stripFillInTheBlank(question: QuestionBlock): ClientQuestionBlock {
  const q = question as FillInTheBlankQuestion;
  return {
    type: 'fill_in_the_blank',
    promptTemplate: q.promptTemplate,
    blanks: q.blanks.map(({ id }) => ({ id })),
  };
}

function stripMatching(question: QuestionBlock): ClientQuestionBlock {
  const q = question as MatchingQuestion;
  return {
    type: 'matching',
    prompt: q.prompt,
    leftItems: q.leftItems.map(({ id, text }) => ({ id, text })),
    rightItems: q.rightItems.map(({ id, text }) => ({ id, text })),
  };
}

function stripOrdering(question: QuestionBlock): ClientQuestionBlock {
  const q = question as OrderingQuestion;
  return {
    type: 'ordering',
    prompt: q.prompt,
    items: q.items.map(({ id, text }) => ({ id, text })),
  };
}

function stripDragAndDrop(question: QuestionBlock): ClientQuestionBlock {
  const q = question as DragAndDropQuestion;
  return {
    type: 'drag_and_drop',
    prompt: q.prompt,
    sentenceTemplate: q.sentenceTemplate,
    zones: q.zones.map(({ id, label }) => ({ id, label })),
    items: q.items.map(({ id, text }) => ({ id, text })),
  };
}

function stripEssay(question: QuestionBlock): ClientQuestionBlock {
  const q = question as EssayQuestion;
  return {
    type: 'essay',
    prompt: q.prompt,
    ...(q.rubric && {
      rubric: q.rubric.map(({ id, label, description, maxPoints }) => ({
        id,
        label,
        description,
        maxPoints,
      })),
    }),
    ...(q.minWords !== undefined && { minWords: q.minWords }),
    ...(q.maxWords !== undefined && { maxWords: q.maxWords }),
    ...(q.allowAttachments !== undefined && {
      allowAttachments: q.allowAttachments,
    }),
    ...(q.deliveryOption && { deliveryOption: q.deliveryOption }),
    ...(q.allowTeacherRubric !== undefined && {
      allowTeacherRubric: q.allowTeacherRubric,
    }),
  };
}

// ─── Register All Handlers ───────────────────────────────────────────────────

registerQuestionType({
  type: 'multiple_choice',
  score: scoreMultipleChoice,
  stripAnswers: stripMultipleChoice,
});

registerQuestionType({
  type: 'true_false',
  score: scoreTrueFalse,
  stripAnswers: stripTrueFalse,
});

registerQuestionType({
  type: 'fill_in_the_blank',
  score: scoreFillInTheBlank,
  stripAnswers: stripFillInTheBlank,
});

registerQuestionType({
  type: 'matching',
  score: scoreMatching,
  stripAnswers: stripMatching,
});

registerQuestionType({
  type: 'ordering',
  score: scoreOrdering,
  stripAnswers: stripOrdering,
});

registerQuestionType({
  type: 'drag_and_drop',
  score: scoreDragAndDrop,
  stripAnswers: stripDragAndDrop,
});

registerQuestionType({
  type: 'essay',
  score: scoreEssay,
  stripAnswers: stripEssay,
});
