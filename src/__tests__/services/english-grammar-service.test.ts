import { beforeEach, describe, expect, it, vi } from 'vitest';

const generateText = vi.hoisted(() =>
  vi.fn(async () => ({
    output: {
      hasErrors: false,
      grammarStructure: 'Subject + Verb',
      tense: 'Simple Present',
      issues: [],
      explanation: 'Clear sentence.',
      structuralMap: [
        {
          text: 'White',
          role: 'Subject',
          explanation: 'The topic of the clause.',
        },
      ],
      tenseExplanation: 'Used for a general fact.',
      strengths: ['Natural phrase choice.'],
      styleVariations: [
        {
          label: 'More concise',
          sentence: 'White can transpose freely.',
        },
      ],
    },
  }))
);

vi.mock('ai', async (importOriginal) => ({
  ...(await importOriginal<typeof import('ai')>()),
  generateText,
}));

vi.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: () => (model: string) => ({
    provider: 'openrouter',
    model,
  }),
}));

describe('GrammarService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENROUTER_API_KEY = 'test-key';
  });

  it('asks for learner-facing structural mapping and style upgrades', async () => {
    const { GrammarService } = await import(
      '@/services/english/GrammarService'
    );

    await GrammarService.analyze('White has many opportunities.');

    const calls = generateText.mock.calls as unknown as Array<
      [{ system: string; output: { name: string } }]
    >;
    const request = calls[0]?.[0];
    if (!request) throw new Error('generateText was not called');

    expect(request.system).toContain('map grammar roles directly');
    expect(request.system).toContain('why the tense is appropriate');
    expect(request.system).toContain('Ways to say this');
    expect(request.output.name).toBe('object');
  });

  it('normalizes structural map roles to lowercase', async () => {
    const { GrammarService } = await import(
      '@/services/english/GrammarService'
    );

    const result = await GrammarService.analyze(
      'White has many opportunities.'
    );

    expect(result.structuralMap[0]?.role).toBe('subject');
  });
});
