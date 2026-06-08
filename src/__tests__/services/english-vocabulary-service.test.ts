import { beforeEach, describe, expect, it, vi } from 'vitest';

const generateObject = vi.hoisted(() =>
  vi.fn(async () => ({
    object: {
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
  generateObject,
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
      '@/services/english/vocabulary.service'
    );

    const result = await VocabularyService.analyze('Hello there!');

    expect(dictionaryLookup).toHaveBeenCalledWith('hello', 'mw-learners');
    expect(result.vocabulary[0]?.ipa).toBe('/həˈloʊ/');
    expect(result.vocabulary[0]?.audioUrl).toContain('merriam-webster.com');
  });

  it('asks the AI model to produce IPA notation for each vocabulary item', async () => {
    const { VocabularyService } = await import(
      '@/services/english/vocabulary.service'
    );

    await VocabularyService.analyze('Hello there!');

    const calls = generateObject.mock.calls as unknown as Array<
      [{ system: string }]
    >;
    const request = calls[0]?.[0];
    if (!request) throw new Error('generateObject was not called');

    expect(request.system).toContain('IPA');
    expect(request.system).toContain('phonemic');
  });

  it('preserves learner sentence text instead of using AI-corrected sentence splits', async () => {
    generateObject.mockResolvedValueOnce({
      object: {
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
      '@/services/english/vocabulary.service'
    );

    const result = await VocabularyService.analyze('I were ate.');

    expect(result.sentences).toEqual(['I were ate.']);
  });
});
