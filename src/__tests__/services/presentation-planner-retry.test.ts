import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mocks, MockNoObjectGeneratedError } = vi.hoisted(() => {
  class MockNoObjectGeneratedError extends Error {
    name = 'AI_NoObjectGeneratedError';
    text: string;
    finishReason: string;
    usage: any;
    constructor({
      text = '',
      finishReason = 'stop',
      usage = { inputTokens: 1000, outputTokens: 16000 },
    }: any) {
      super('No object generated: could not parse the response.');
      this.text = text;
      this.finishReason = finishReason;
      this.usage = usage;
    }
    static isInstance(err: unknown) {
      return (
        err instanceof MockNoObjectGeneratedError ||
        (err as any)?.name === 'AI_NoObjectGeneratedError'
      );
    }
  }

  return {
    mocks: {
      generateText: vi.fn(),
    },
    MockNoObjectGeneratedError,
  };
});

vi.mock('ai', () => ({
  generateText: mocks.generateText,
  Output: { object: vi.fn((config) => ({ kind: 'object-output', ...config })) },
  NoObjectGeneratedError: MockNoObjectGeneratedError,
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
    generatePlan: (
      o: Record<string, unknown>
    ) => Promise<{ slides: unknown[] }>;
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
  lessonContent:
    'Sample sizes, group means, t-value and p-value for two platforms.',
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

  it('retries colder on a stronger model when the output was unparseable', async () => {
    mocks.generateText
      .mockResolvedValueOnce(noOutput('stop', 'Here is your deck!'))
      .mockResolvedValueOnce(withOutput(2));

    const plan = await generatePlan(opts);

    expect(mocks.generateText).toHaveBeenCalledTimes(2);
    expect(mocks.generateText.mock.calls[1][0].temperature).toBeLessThan(
      mocks.generateText.mock.calls[0][0].temperature
    );
    // Losing the structured-output format is not a temperature problem: asking
    // the same model again mostly reproduces it, so the retry moves up a tier.
    expect(mocks.generateText.mock.calls[1][0].model).not.toEqual(
      mocks.generateText.mock.calls[0][0].model
    );
    expect(plan.slides).toHaveLength(2);
  });

  it('plans on a model above the lite chat default', async () => {
    mocks.generateText.mockResolvedValueOnce(withOutput(3));

    await generatePlan(opts);

    // The deck-sized structured output is what the lite tier drops; guard the
    // choice so it cannot silently follow the chat default back down.
    expect(mocks.generateText.mock.calls[0][0].model).toEqual({
      model: 'gemini-3.5-flash',
    });
  });

  it('keeps the same model when the failure was truncation', async () => {
    mocks.generateText
      .mockResolvedValueOnce(noOutput('length', '{"slides":[{"layoutT'))
      .mockResolvedValueOnce(withOutput(3));

    await generatePlan(opts);

    // A cut-off object means the model was doing the right thing and ran out
    // of room; a bigger budget on the same model is the cheaper answer.
    expect(mocks.generateText.mock.calls[1][0].model).toEqual(
      mocks.generateText.mock.calls[0][0].model
    );
  });

  it('surfaces the finish reason when both attempts fail', async () => {
    mocks.generateText
      .mockResolvedValueOnce(noOutput('length'))
      .mockResolvedValueOnce(noOutput('length'));

    await expect(generatePlan(opts)).rejects.toThrow(/finish reason: length/);
  });

  it('does not retry when the first attempt succeeded', async () => {
    mocks.generateText.mockResolvedValueOnce(withOutput(4));

    const plan = await generatePlan(opts);

    expect(mocks.generateText).toHaveBeenCalledTimes(1);
    expect(plan.slides).toHaveLength(4);
  });

  it('recovers valid plan from markdown code fences when generateText rejects with NoObjectGeneratedError', async () => {
    const rawFencedJson =
      '```json\n' +
      JSON.stringify({
        slides: [
          {
            layoutType: 'TITLE_BULLETS',
            slideTitle: 'Slide 1',
            bindings: { bullets: ['A point that carries a real explanation'] },
          },
        ],
        recommendedCollection: 'rmit_official',
      }) +
      '\n```';

    mocks.generateText.mockRejectedValueOnce(
      new MockNoObjectGeneratedError({
        text: rawFencedJson,
        finishReason: 'stop',
      })
    );

    const plan = await generatePlan(opts);

    expect(mocks.generateText).toHaveBeenCalledTimes(1);
    expect(plan.slides).toHaveLength(1);
    expect((plan.slides[0] as any).slideTitle).toBe('Slide 1');
  });

  it('retries with larger budget when generateText rejects with length NoObjectGeneratedError', async () => {
    mocks.generateText
      .mockRejectedValueOnce(
        new MockNoObjectGeneratedError({
          text: '{"slides":[{"layoutT',
          finishReason: 'length',
        })
      )
      .mockResolvedValueOnce(withOutput(3));

    const plan = await generatePlan(opts);

    expect(mocks.generateText).toHaveBeenCalledTimes(2);
    expect(mocks.generateText.mock.calls[1][0].maxOutputTokens).toBe(32000);
    expect(plan.slides).toHaveLength(3);
  });
});
