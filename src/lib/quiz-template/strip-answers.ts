/**
 * Transforms full QuestionBlock objects (with answer data) into
 * client-safe DTOs that strip all correctness information.
 *
 * This module runs on the SERVER only. It ensures that no answer keys
 * are ever sent to the student's browser.
 */

import type {
  ClientDragAndDropQuestion,
  ClientEssayQuestion,
  ClientFillInTheBlankQuestion,
  ClientMatchingQuestion,
  ClientMultipleChoiceQuestion,
  ClientOrderingQuestion,
  ClientQuestionBlock,
  ClientQuizContent,
  ClientTimedChallengeQuestion,
  ClientTrueFalseQuestion,
} from './client-types';
import type {
  DragAndDropQuestion,
  EssayQuestion,
  FillInTheBlankQuestion,
  MatchingQuestion,
  MultipleChoiceQuestion,
  OrderingQuestion,
  QuestionBlock,
  QuizContent,
  TimedChallengeQuestion,
  TrueFalseQuestion,
} from './types';

// ─── Individual Question Strippers ───────────────────────────────────────────

function stripMultipleChoice(
  q: MultipleChoiceQuestion
): ClientMultipleChoiceQuestion {
  return {
    type: 'multiple-choice',
    prompt: q.prompt,
    options: q.options.map(({ id, text }) => ({ id, text })),
  };
}

function stripTrueFalse(q: TrueFalseQuestion): ClientTrueFalseQuestion {
  return {
    type: 'true-false',
    prompt: q.prompt,
  };
}

function stripFillInTheBlank(
  q: FillInTheBlankQuestion
): ClientFillInTheBlankQuestion {
  return {
    type: 'fill-in-the-blank',
    promptTemplate: q.promptTemplate,
    blanks: q.blanks.map(({ id }) => ({ id })),
  };
}

function stripMatching(q: MatchingQuestion): ClientMatchingQuestion {
  return {
    type: 'matching',
    prompt: q.prompt,
    leftItems: q.leftItems.map(({ id, text }) => ({ id, text })),
    rightItems: q.rightItems.map(({ id, text }) => ({ id, text })),
  };
}

function stripOrdering(q: OrderingQuestion): ClientOrderingQuestion {
  return {
    type: 'ordering',
    prompt: q.prompt,
    items: q.items.map(({ id, text }) => ({ id, text })),
  };
}

function stripDragAndDrop(q: DragAndDropQuestion): ClientDragAndDropQuestion {
  return {
    type: 'drag-and-drop',
    prompt: q.prompt,
    sentenceTemplate: q.sentenceTemplate,
    zones: q.zones.map(({ id, label }) => ({ id, label })),
    items: q.items.map(({ id, text }) => ({ id, text })),
  };
}

function stripEssay(q: EssayQuestion): ClientEssayQuestion {
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

function stripTimedChallenge(
  q: TimedChallengeQuestion
): ClientTimedChallengeQuestion {
  return {
    type: 'timed-challenge',
    prompt: q.prompt,
    innerQuestion: stripQuestionBlock(q.innerQuestion),
    timeLimitSeconds: q.timeLimitSeconds,
  };
}

// ─── Main Strip Function ─────────────────────────────────────────────────────

/**
 * Strips answer/correctness data from a single question block.
 */
export function stripQuestionBlock(
  question: QuestionBlock
): ClientQuestionBlock {
  switch (question.type) {
    case 'multiple-choice':
      return stripMultipleChoice(question);
    case 'true-false':
      return stripTrueFalse(question);
    case 'fill-in-the-blank':
      return stripFillInTheBlank(question);
    case 'matching':
      return stripMatching(question);
    case 'ordering':
      return stripOrdering(question);
    case 'drag-and-drop':
      return stripDragAndDrop(question);
    case 'essay':
      return stripEssay(question);
    case 'timed-challenge':
      return stripTimedChallenge(question);
    default:
      return question as ClientQuestionBlock;
  }
}

/**
 * Strips answer data from all questions in a QuizContent object.
 * Use this before sending quiz data to the client.
 */
export function stripQuizAnswers(quiz: QuizContent): ClientQuizContent {
  return {
    title: quiz.title,
    description: quiz.description,
    type: quiz.type,
    questions: quiz.questions.map(stripQuestionBlock),
  };
}
