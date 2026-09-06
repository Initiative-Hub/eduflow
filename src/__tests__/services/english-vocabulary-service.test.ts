import { beforeEach, describe, expect, it, vi } from 'vitest';

const generateText = vi.hoisted(() =>
  vi.fn(async () => ({
    output: {
      vocabulary: [
        {
          word: 'hello',
          partOfSpeech: 'exclamation',
          ipa: '/həˈloʊ/',
          englishDefinition: 'A greeting.',
          vietnameseTranslation: 'Một lời chào dùng khi gặp ai đó.',
          exampleSentence: 'Hello there!',
        },
      ],
      sentences: ['Hello there!'],
    },
  }))
);
const dictionaryLookup = vi.hoisted(() =>
  vi.fn(async () => ({
    word: 'hello',
    phonetic: 'ˈhe-ˌlō',
    audioUrl:
      'https://media.merriam-webster.com/audio/prons/en/us/mp3/h/hello.mp3',
    meanings: [],
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

vi.mock('@/services/dictionary', () => ({
  DictionaryService: {
    lookup: dictionaryLookup,
  },
}));

describe('VocabularyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENROUTER_API_KEY = 'test-key';
  });

  it('keeps AI-generated IPA and enriches audio from Merriam-Webster', async () => {
    const { VocabularyService } = await import(
      '@/services/english/VocabularyService'
    );

    const result = await VocabularyService.analyze('Hello there!');

    expect(dictionaryLookup).toHaveBeenCalledWith('hello', 'mw-learners');
    expect(result.vocabulary[0]?.ipa).toBe('/həˈloʊ/');
    expect(result.vocabulary[0]?.audioUrl).toContain('merriam-webster.com');
  });

  it('asks the AI model to produce IPA notation for each vocabulary item', async () => {
    const { VocabularyService } = await import(
      '@/services/english/VocabularyService'
    );

    await VocabularyService.analyze('Hello there!');

    const calls = generateText.mock.calls as unknown as Array<
      [{ instructions: string; output: { name: string } }]
    >;
    const request = calls[0]?.[0];
    if (!request) throw new Error('generateText was not called');

    expect(request.instructions).toContain('IPA');
    expect(request.instructions).toContain('phonemic');
    expect(request.output.name).toBe('object');
  });

  it('preserves learner sentence text instead of using AI-corrected sentence splits', async () => {
    generateText.mockResolvedValueOnce({
      output: {
        vocabulary: [
          {
            word: 'eat',
            partOfSpeech: 'verb',
            ipa: '/iːt/',
            englishDefinition: 'To put food in your mouth and swallow it.',
            vietnameseTranslation: 'Ăn; đưa thức ăn vào miệng và nuốt.',
            exampleSentence: 'I ate.',
          },
        ],
        sentences: ['I ate.'],
      },
    });

    const { VocabularyService } = await import(
      '@/services/english/VocabularyService'
    );

    const result = await VocabularyService.analyze('I were ate.');

    expect(result.sentences).toEqual(['I were ate.']);
  });

  it('uses the full source sentence when the AI example is only a phrase', async () => {
    generateText.mockResolvedValueOnce({
      output: {
        vocabulary: [
          {
            word: 'direct',
            partOfSpeech: 'adjective',
            ipa: '/dəˈrekt/',
            englishDefinition: 'Straight or immediate.',
            vietnameseTranslation: 'Trực tiếp; không vòng vo.',
            exampleSentence: 'under direct attack',
          },
        ],
        sentences: ['under direct attack'],
      },
    });

    const { VocabularyService } = await import(
      '@/services/english/VocabularyService'
    );

    const result = await VocabularyService.analyze(
      'The king is under direct attack, so there is no escape.'
    );

    expect(result.vocabulary[0]?.exampleSentence).toBe(
      'The king is under direct attack, so there is no escape.'
    );
  });
});
