import { describe, expect, it } from 'vitest';
import {
  getQuestionPrompt,
  resolveReferencedQuestions,
} from '@/services/quiz-question-references';

describe('quiz question references', () => {
  it('resolves linked question rows in quiz order and exposes their IDs', () => {
    const result = resolveReferencedQuestions(
      [
        {
          questionId: 'question-2',
          orderIndex: 1,
          question: {
            answerData: { type: 'true_false', prompt: 'Second' },
            explanation: 'Because it is false',
          },
        },
        {
          questionId: 'question-1',
          orderIndex: 0,
          question: {
            answerData: { type: 'true_false', prompt: 'First' },
            explanation: null,
          },
        },
      ],
      [{ type: 'true_false', prompt: 'Legacy' }]
    );

    expect(result).toEqual({
      questionIds: ['question-1', 'question-2'],
      questions: [
        { type: 'true_false', prompt: 'First' },
        {
          type: 'true_false',
          prompt: 'Second',
          explanation: 'Because it is false',
        },
      ],
    });
  });

  it('falls back to legacy quiz JSON when no references exist', () => {
    const legacyQuestions = [{ type: 'essay', prompt: 'Explain gravity' }];

    expect(resolveReferencedQuestions([], legacyQuestions)).toEqual({
      questionIds: [],
      questions: legacyQuestions,
    });
  });

  it('extracts the visible prompt from every supported prompt shape', () => {
    expect(
      getQuestionPrompt({
        type: 'fill_in_the_blank',
        promptTemplate: 'Water freezes at {{temperature}}.',
      })
    ).toBe('Water freezes at {{temperature}}.');
    expect(getQuestionPrompt({ type: 'true_false', prompt: 'The sky is blue' }))
      .toBe('The sky is blue');
  });
});
