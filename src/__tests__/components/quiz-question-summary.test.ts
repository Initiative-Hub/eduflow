import { describe, expect, it } from 'vitest';
import {
  getQuestionSummary,
  getSolutionSummary,
} from '@/components/quiz/editors/quiz-question-summary';
import type { QuestionBlock } from '@/lib/quiz-template/types';

describe('quiz question summaries', () => {
  it('uses a fill-in-the-blank prompt before falling back to the template', () => {
    const question = {
      type: 'fill_in_the_blank',
      prompt: 'Choose the missing trading principle.',
      promptTemplate: 'Capture with the {{blank1}} value piece first.',
      blanks: [{ id: 'blank1', acceptableAnswers: ['lowest'] }],
    } as QuestionBlock;

    expect(getQuestionSummary(question)).toBe(
      'Choose the missing trading principle.'
    );
  });

  it('falls back to the fill-in-the-blank template when no prompt exists', () => {
    const question = {
      type: 'fill_in_the_blank',
      promptTemplate: 'Capture with the {{blank1}} value piece first.',
      blanks: [{ id: 'blank1', acceptableAnswers: ['lowest'] }],
    } as QuestionBlock;

    expect(getQuestionSummary(question)).toBe(
      'Capture with the {{blank1}} value piece first.'
    );
  });

  it('summarizes matching solutions with compact item codes', () => {
    const question: QuestionBlock = {
      type: 'matching',
      prompt: 'Match each concept with its meaning.',
      leftItems: [
        { id: 'l1', text: 'Free gift' },
        { id: 'l2', text: 'Rule of numbers' },
      ],
      rightItems: [
        { id: 'r1', text: 'Undefended piece' },
        { id: 'r2', text: 'Count attackers' },
      ],
      correctPairs: [
        { leftId: 'l2', rightId: 'r2' },
        { leftId: 'l1', rightId: 'r1' },
      ],
    };

    expect(getSolutionSummary(question)).toBe('L2 <-> R2, L1 <-> R1');
  });
});
