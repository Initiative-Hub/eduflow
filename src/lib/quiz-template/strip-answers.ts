/**
 * Transforms full QuestionBlock objects (with answer data) into
 * client-safe DTOs that strip all correctness information.
 *
 * This module runs on the SERVER only. It ensures that no answer keys
 * are ever sent to the student's browser.
 */

import type {
  ClientQuestionBlock,
  ClientQuizContent,
  QuestionBlock,
  QuizContent,
} from './types';

// Ensure all handlers are registered before stripping
import './handlers';
import { getHandler } from './registry';

// ─── Main Strip Function ─────────────────────────────────────────────────────

/**
 * Strips answer/correctness data from a single question block.
 * Delegates to the registered handler for the question's type.
 */
export function stripQuestionBlock(
  question: QuestionBlock
): ClientQuestionBlock {
  const handler = getHandler(question.type);
  return handler.stripAnswers(question);
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
