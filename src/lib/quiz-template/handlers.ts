/**
 * Question Type Handler Registrations
 *
 * Registers all 8 question types with their scoring and answer-stripping
 * functions. Import this module to ensure all handlers are registered.
 *
 * Note: The timed-challenge handler delegates to getHandler() for its inner
 * question. This works because all handlers are registered synchronously
 * in this module before any scoring/stripping calls occur at runtime.
 */

import { getHandler, registerQuestionType } from './registry';
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
  TimedChallengeQuestion,
  TrueFalseQuestion,
} from './types';

// ─── Scoring Functions ───────────────────────────────────────────────────────

function scoreMultipleChoice(
  question: QuestionBlock,
  answer: StudentAnswer
): boolean {
  if (question.type !== 'multiple-choice' || answer.type !== 'multiple-choice')
    return false;
  const correctOption = question.options.find((o) => o.isCorrect);
  return correctOption?.id === answer.selectedOptionId;
}

function scoreTrueFalse(
  question: QuestionBlock,
  answer: StudentAnswer
): boolean {
  if (question.type !== 'true-false' || answer.type !== 'true-false')
    return false;
  return question.correctAnswer === answer.selectedAnswer;
}

function scoreFillInTheBlank(
  question: QuestionBlock,
  answer: StudentAnswer
): boolean {
  if (
    question.type !== 'fill-in-the-blank' ||
    answer.type !== 'fill-in-the-blank'
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
  if (question.type !== 'drag-and-drop' || answer.type !== 'drag-and-drop')
    return false;
  return question.zones.every(
    (zone) => answer.placements[zone.id] === question.correctMapping[zone.id]
  );
}

function scoreEssay(_question: QuestionBlock, _answer: StudentAnswer): boolean {
  // Essays are never auto-scored; handled separately as pendingReview
  return false;
}

function scoreTimedChallenge(
  question: QuestionBlock,
  answer: StudentAnswer
): boolean {
  if (question.type !== 'timed-challenge') return false;
  const innerHandler = getHandler(question.innerQuestion.type);
  return innerHandler.score(question.innerQuestion, answer);
}

// ─── Strip Functions ─────────────────────────────────────────────────────────

function stripMultipleChoice(question: QuestionBlock): ClientQuestionBlock {
  const q = question as MultipleChoiceQuestion;
  return {
    type: 'multiple-choice',
    prompt: q.prompt,
    options: q.options.map(({ id, text }) => ({ id, text })),
  };
}

function stripTrueFalse(question: QuestionBlock): ClientQuestionBlock {
  const q = question as TrueFalseQuestion;
  return {
    type: 'true-false',
    prompt: q.prompt,
  };
}

function stripFillInTheBlank(question: QuestionBlock): ClientQuestionBlock {
  const q = question as FillInTheBlankQuestion;
  return {
    type: 'fill-in-the-blank',
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
    type: 'drag-and-drop',
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

function stripTimedChallenge(question: QuestionBlock): ClientQuestionBlock {
  const q = question as TimedChallengeQuestion;
  // Delegate to the inner question's handler for stripping
  const innerHandler = getHandler(q.innerQuestion.type);
  return {
    type: 'timed-challenge',
    prompt: q.prompt,
    innerQuestion: innerHandler.stripAnswers(q.innerQuestion),
    timeLimitSeconds: q.timeLimitSeconds,
  };
}

// ─── Register All Handlers ───────────────────────────────────────────────────

registerQuestionType({
  type: 'multiple-choice',
  score: scoreMultipleChoice,
  stripAnswers: stripMultipleChoice,
});

registerQuestionType({
  type: 'true-false',
  score: scoreTrueFalse,
  stripAnswers: stripTrueFalse,
});

registerQuestionType({
  type: 'fill-in-the-blank',
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
  type: 'drag-and-drop',
  score: scoreDragAndDrop,
  stripAnswers: stripDragAndDrop,
});

registerQuestionType({
  type: 'essay',
  score: scoreEssay,
  stripAnswers: stripEssay,
});

registerQuestionType({
  type: 'timed-challenge',
  score: scoreTimedChallenge,
  stripAnswers: stripTimedChallenge,
});
