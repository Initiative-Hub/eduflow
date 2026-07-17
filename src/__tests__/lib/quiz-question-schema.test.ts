import { describe, expect, it } from 'vitest';
import { questionBlockSchema } from '@/lib/validations/quiz.schema';

describe('questionBlockSchema', () => {
  it('accepts supported matching, ordering, and essay question shapes', () => {
    expect(
      questionBlockSchema.safeParse({
        type: 'matching',
        prompt: 'Match each term.',
        leftItems: [{ id: 'left1', text: 'HTML' }],
        rightItems: [{ id: 'right1', text: 'Markup' }],
        correctPairs: [{ leftId: 'left1', rightId: 'right1' }],
      }).success
    ).toBe(true);

    expect(
      questionBlockSchema.safeParse({
        type: 'ordering',
        prompt: 'Order the steps.',
        items: [
          { id: 'item1', text: 'Plan' },
          { id: 'item2', text: 'Build' },
        ],
        correctOrder: ['item1', 'item2'],
      }).success
    ).toBe(true);

    expect(
      questionBlockSchema.safeParse({
        type: 'essay',
        prompt: 'Explain the tradeoff.',
      }).success
    ).toBe(true);
  });

  it('rejects unsupported timed challenge questions', () => {
    expect(
      questionBlockSchema.safeParse({
        type: 'timed_challenge',
        prompt: 'Answer quickly.',
        timeLimitSeconds: 30,
        innerQuestion: { type: 'true_false', prompt: 'React is a library.' },
      }).success
    ).toBe(false);
  });
});
