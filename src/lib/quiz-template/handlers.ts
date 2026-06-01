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

function normalizeQuestionType(type: string): string {
  return type.toLowerCase().replace(/-/g, '_');
}

// ─── Scoring Functions ───────────────────────────────────────────────────────

function scoreMultipleChoice(
  question: QuestionBlock,
  answer: StudentAnswer
): boolean {
  const questionType = normalizeQuestionType(question.type);
  const answerType = normalizeQuestionType(answer.type);

  if (questionType !== 'multiple_choice' || answerType !== 'multiple_choice')
    return false;

  const multipleChoiceQuestion = question as MultipleChoiceQuestion;
  const multipleChoiceAnswer = answer as StudentAnswer & {
    selectedOptionId: string;
  };
  const correctOption = multipleChoiceQuestion.options.find(
    (option) => option.isCorrect
  );
  return correctOption?.id === multipleChoiceAnswer.selectedOptionId;
}

function scoreTrueFalse(
  question: QuestionBlock,
  answer: StudentAnswer
): boolean {
  const questionType = normalizeQuestionType(question.type);
  const answerType = normalizeQuestionType(answer.type);

  if (questionType !== 'true_false' || answerType !== 'true_false')
    return false;

  const trueFalseQuestion = question as TrueFalseQuestion & {
    options?: Array<{ text?: string; isCorrect?: boolean }>;
  };
  const trueFalseAnswer = answer as StudentAnswer & {
    selectedAnswer: boolean;
  };

  // Backward compatibility: some stored true/false questions use
  // options[] with isCorrect instead of correctAnswer.
  let resolvedCorrectAnswer: boolean | undefined;
  if (typeof trueFalseQuestion.correctAnswer === 'boolean') {
    resolvedCorrectAnswer = trueFalseQuestion.correctAnswer;
  } else if (Array.isArray(trueFalseQuestion.options)) {
    const correctOption = trueFalseQuestion.options.find(
      (option) => option.isCorrect
    );

    if (correctOption?.text) {
      const normalized = correctOption.text.trim().toLowerCase();
      if (normalized === 'true') {
        resolvedCorrectAnswer = true;
      } else if (normalized === 'false') {
        resolvedCorrectAnswer = false;
      }
    }
  }

  if (typeof resolvedCorrectAnswer !== 'boolean') {
    return false;
  }

  return resolvedCorrectAnswer === trueFalseAnswer.selectedAnswer;
}

function scoreFillInTheBlank(
  question: QuestionBlock,
  answer: StudentAnswer
): boolean {
  const questionType = normalizeQuestionType(question.type);
  const answerType = normalizeQuestionType(answer.type);

  if (
    questionType !== 'fill_in_the_blank' ||
    answerType !== 'fill_in_the_blank'
  )
    return false;

  const fillInTheBlankQuestion = question as FillInTheBlankQuestion;
  const fillInTheBlankAnswer = answer as StudentAnswer & {
    filledBlanks: Record<string, string>;
  };

  return fillInTheBlankQuestion.blanks.every((blank) => {
    const studentValue = fillInTheBlankAnswer.filledBlanks[blank.id];
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
