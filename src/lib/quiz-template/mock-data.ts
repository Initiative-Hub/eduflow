/**
 * AI Question Generator (Placeholder).
 * This module provides a simulated AI question generation function.
 * The mock data constants have been moved to __tests__/fixtures.ts for testing only.
 */

import { MOCK_QUESTIONS } from './__tests__/fixtures';
import type { QuestionBankEntry, QuizCategory } from './quiz-schema';

// ─── AI Question Generator (Placeholder) ────────────────────────────────────

/**
 * Simulates AI question generation from lesson content.
 * Returns pre-defined candidate questions after a simulated delay.
 */
export async function generateQuestionsFromLesson(
  lessonId: string,
  category: QuizCategory,
  subType: string,
  count: number
): Promise<QuestionBankEntry[]> {
  // Simulate AI processing delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Return questions from mock data that match the criteria
  const matchingQuestions = MOCK_QUESTIONS.filter(
    (q) =>
      q.lessonId === lessonId &&
      q.category === category &&
      q.subType === subType
  );

  if (matchingQuestions.length > 0) {
    return matchingQuestions.slice(0, count);
  }

  // Fallback: return generic questions for the category/subType
  const fallbackQuestions = MOCK_QUESTIONS.filter(
    (q) => q.category === category && q.subType === subType
  );

  return fallbackQuestions.slice(0, count);
}
