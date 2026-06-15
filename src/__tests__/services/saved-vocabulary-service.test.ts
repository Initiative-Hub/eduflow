import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VocabularyItem } from '@/services/english/VocabularyService';

const savedVocabulary = vi.hoisted(() => ({
  count: vi.fn(),
  createMany: vi.fn(),
  deleteMany: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    savedVocabulary,
  },
}));

const comet: VocabularyItem = {
  word: ' Comet ',
  partOfSpeech: 'noun',
  ipa: '/ˈkɑːmɪt/',
  audioUrl: null,
  englishDefinition: 'A celestial object consisting of ice and dust.',
  vietnameseTranslation: 'Sao chổi.',
  exampleSentence:
    'Along with asteroids and comets, the planets orbit the Sun.',
};

describe('SavedVocabularyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    savedVocabulary.count.mockResolvedValue(0);
    savedVocabulary.createMany.mockResolvedValue({ count: 1 });
    savedVocabulary.deleteMany.mockResolvedValue({ count: 1 });
    savedVocabulary.findMany.mockResolvedValue([]);
  });

  it('saves normalized vocabulary once per user and skips duplicates', async () => {
    const { SavedVocabularyService } = await import(
      '@/services/english/SavedVocabularyService'
    );

    const result = await SavedVocabularyService.saveMany('user-1', [
      comet,
      { ...comet, word: 'comet' },
    ]);

    expect(savedVocabulary.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: 'user-1',
          word: 'comet',
          partOfSpeech: 'noun',
          ipa: '/ˈkɑːmɪt/',
          audioUrl: null,
          englishDefinition: 'A celestial object consisting of ice and dust.',
          vietnameseTranslation: 'Sao chổi.',
          exampleSentence:
            'Along with asteroids and comets, the planets orbit the Sun.',
          sourceSnippet: null,
        },
      ],
      skipDuplicates: true,
    });
    expect(result.savedCount).toBe(1);
  });

  it('lists saved vocabulary with total and saved word lookup metadata', async () => {
    savedVocabulary.count.mockResolvedValue(1);
    savedVocabulary.findMany.mockResolvedValue([
      {
        id: 'saved-1',
        userId: 'user-1',
        word: 'comet',
        partOfSpeech: 'noun',
        ipa: '/ˈkɑːmɪt/',
        audioUrl: null,
        englishDefinition: 'A celestial object consisting of ice and dust.',
        vietnameseTranslation: 'Sao chổi.',
        exampleSentence:
          'Along with asteroids and comets, the planets orbit the Sun.',
        sourceSnippet: null,
        savedAt: new Date('2026-06-16T00:00:00.000Z'),
      },
    ]);

    const { SavedVocabularyService } = await import(
      '@/services/english/SavedVocabularyService'
    );

    const result = await SavedVocabularyService.list('user-1');

    expect(savedVocabulary.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { savedAt: 'desc' },
    });
    expect(result.total).toBe(1);
    expect(result.savedWords).toEqual(['comet']);
  });

  it('removes a vocabulary word by normalized text for the current user', async () => {
    const { SavedVocabularyService } = await import(
      '@/services/english/SavedVocabularyService'
    );

    const result = await SavedVocabularyService.remove('user-1', ' Comet ');

    expect(savedVocabulary.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', word: 'comet' },
    });
    expect(result.removedCount).toBe(1);
  });
});
