import { prisma } from '@/lib/prisma';
import type { VocabularyItem } from './VocabularyService';

export type SavedVocabularyItem = VocabularyItem & {
  id: string;
  savedAt: string;
  sourceSnippet: string | null;
};

export interface SavedVocabularyListResult {
  items: SavedVocabularyItem[];
  total: number;
  savedWords: string[];
}

export interface SaveVocabularyResult {
  savedCount: number;
  total: number;
  savedWords: string[];
}

export interface RemoveVocabularyResult {
  removedCount: number;
  total: number;
  savedWords: string[];
}

type SaveVocabularyInput = VocabularyItem & {
  sourceSnippet?: string | null;
};

const normalizeWord = (word: string) => word.trim().toLowerCase();

const toSavedVocabularyItem = (item: {
  id: string;
  word: string;
  partOfSpeech: string;
  ipa: string | null;
  audioUrl: string | null;
  englishDefinition: string;
  vietnameseTranslation: string;
  exampleSentence: string;
  sourceSnippet: string | null;
  savedAt: Date;
}): SavedVocabularyItem => ({
  id: item.id,
  word: item.word,
  partOfSpeech: item.partOfSpeech,
  ipa: item.ipa,
  audioUrl: item.audioUrl,
  englishDefinition: item.englishDefinition,
  vietnameseTranslation: item.vietnameseTranslation,
  exampleSentence: item.exampleSentence,
  sourceSnippet: item.sourceSnippet,
  savedAt: item.savedAt.toISOString(),
});

async function getSavedWords(userId: string) {
  const rows = await prisma.savedVocabulary.findMany({
    where: { userId },
    orderBy: { savedAt: 'desc' },
  });

  return {
    items: rows.map(toSavedVocabularyItem),
    savedWords: rows.map((item) => item.word),
  };
}

export class SavedVocabularyService {
  static normalizeWord = normalizeWord;

  static async list(userId: string): Promise<SavedVocabularyListResult> {
    const totalPromise = prisma.savedVocabulary.count({ where: { userId } });
    const wordsPromise = getSavedWords(userId);
    const [total, { items, savedWords }] = await Promise.all([
      totalPromise,
      wordsPromise,
    ]);

    return { items, total, savedWords };
  }

  static async saveMany(
    userId: string,
    vocabulary: SaveVocabularyInput[]
  ): Promise<SaveVocabularyResult> {
    const uniqueVocabulary = new Map<string, SaveVocabularyInput>();

    for (const item of vocabulary) {
      const word = normalizeWord(item.word);
      if (!word || uniqueVocabulary.has(word)) continue;
      uniqueVocabulary.set(word, item);
    }

    if (uniqueVocabulary.size > 0) {
      await prisma.savedVocabulary.createMany({
        data: Array.from(uniqueVocabulary, ([word, item]) => ({
          userId,
          word,
          partOfSpeech: item.partOfSpeech.trim(),
          ipa: item.ipa?.trim() || null,
          audioUrl: item.audioUrl?.trim() || null,
          englishDefinition: item.englishDefinition.trim(),
          vietnameseTranslation: item.vietnameseTranslation.trim(),
          exampleSentence: item.exampleSentence.trim(),
          sourceSnippet: item.sourceSnippet?.trim() || null,
        })),
        skipDuplicates: true,
      });
    }

    const { total, savedWords } = await this.list(userId);

    return {
      savedCount: uniqueVocabulary.size,
      total,
      savedWords,
    };
  }

  static async remove(
    userId: string,
    word: string
  ): Promise<RemoveVocabularyResult> {
    const normalizedWord = normalizeWord(word);
    const result = normalizedWord
      ? await prisma.savedVocabulary.deleteMany({
          where: { userId, word: normalizedWord },
        })
      : { count: 0 };
    const { total, savedWords } = await this.list(userId);

    return {
      removedCount: result.count,
      total,
      savedWords,
    };
  }
}
