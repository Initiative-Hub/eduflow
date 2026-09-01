import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  generateText: vi.fn(),
}));

vi.mock('ai', () => ({
  generateText: mocks.generateText,
  Output: { object: vi.fn((config) => ({ kind: 'object-output', ...config })) },
}));

vi.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: vi.fn(() => (model: string) => ({ model })),
}));

vi.mock('@/services/LessonService', () => ({ LessonService: {} }));

import { PresentationService } from '@/services/PresentationService';

/**
 * `generatePlan` is private to the class but is the unit under test: it owns the
 * retry. Reaching it through a cast keeps the test on the real code path rather
 * than on a wrapper that also fetches the lesson.
 */
const generatePlan = (
  PresentationService as unknown as {
    generatePlan: (o: Record<string, unknown>) => Promise<{ slides: unknown[] }>;
  }
).generatePlan.bind(PresentationService);

/** A result whose `output` getter throws, as the SDK does with no usable output. */
function noOutput(finishReason: string, text = '') {
  return {
    get output(): never {
      throw new Error('No output generated.');
    },
    finishReason,
    usage: { inputTokens: 1000, outputTokens: 16000 },
    text,
  };
}

function withOutput(slideCount: number) {
  return {
    output: {
      slides: Array.from({ length: slideCount }, (_, i) => ({
        layoutType: 'TITLE_BULLETS',
        slideTitle: `Slide ${i + 1}`,
        bindings: { bullets: ['A point that carries a real explanation'] },
      })),
      recommendedCollection: 'eduflow_purple',
    },
    finishReason: 'stop',
    usage: { inputTokens: 1000, outputTokens: 2000 },
    text: '{}',
  };
}

const opts = {
  lessonTitle: 'Independent Samples T-Tests',
  lessonContent: 'Sample sizes, group means, t-value and p-value for two platforms.',
  duration: '15',
};

describe('presentation planner retry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    process.env.OPENROUTER_API_KEY = 'test-key';
  });

  it('retries with more room when the first attempt was cut off mid-JSON', async () => {
    mocks.generateText
      .mockResolvedValueOnce(noOutput('length', '{"slides":[{"layoutT'))
      .mockResolvedValueOnce(withOutput(3));

    const plan = await generatePlan(opts);

    expect(mocks.generateText).toHaveBeenCalledTimes(2);
    // truncation is answered with a bigger budget, not a colder temperature
    expect(mocks.generateText.mock.calls[0][0].maxOutputTokens).toBe(16000);
    expect(mocks.generateText.mock.calls[1][0].maxOutputTokens).toBe(32000);
    expect(plan.slides).toHaveLength(3);
  });

  it('retries colder when the model emitted something unparseable', async () => {
    mocks.generateText
      .mockResolvedValueOnce(noOutput('stop', 'Here is your deck!'))
      .mockResolvedValueOnce(withOutput(2));

    const plan = await generatePlan(opts);

    expect(mocks.generateText).toHaveBeenCalledTimes(2);
    expect(mocks.generateText.mock.calls[1][0].temperature).toBeLessThan(
      mocks.generateText.mock.calls[0][0].temperature
    );
    expect(plan.slides).toHaveLength(2);
  });

  it('surfaces the finish reason when both attempts fail', async () => {
    mocks.generateText
      .mockResolvedValueOnce(noOutput('length'))
      .mockResolvedValueOnce(noOutput('length'));

    await expect(generatePlan(opts)).rejects.toThrow(
      /finish reason: length/
    );
  });

  it('does not retry when the first attempt succeeded', async () => {
    mocks.generateText.mockResolvedValueOnce(withOutput(4));

    const plan = await generatePlan(opts);

    expect(mocks.generateText).toHaveBeenCalledTimes(1);
    expect(plan.slides).toHaveLength(4);
  });
});
