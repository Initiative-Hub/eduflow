import { prisma } from '@/lib/prisma';
import { listSavedVocabulary } from './list';
import { normalizeWord } from './mappers';
import type {
  RemoveVocabularyResult,
  SaveVocabularyInput,
  SaveVocabularyResult,
} from './types';

export async function saveVocabulary(
  userId: string,
  vocabulary: SaveVocabularyInput[]
): Promise<SaveVocabularyResult> {
  const normalizedVocabulary = vocabulary
    .map((item) => ({ item, word: normalizeWord(item.word) }))
    .filter(({ word }) => Boolean(word));

  let savedCount = 0;

  if (normalizedVocabulary.length > 0) {
    const result = await prisma.savedVocabulary.createMany({
      data: normalizedVocabulary.map(({ word, item }) => ({
        userId,
        word,
        partOfSpeech: item.partOfSpeech.trim(),
        ipa: item.ipa?.trim() || null,
        audioUrl: item.audioUrl?.trim() || null,
        englishDefinition: item.englishDefinition.trim(),
        vietnameseTranslation: item.vietnameseTranslation.trim(),
        exampleSentence: item.exampleSentence.trim(),
        sourceSnippet: item.sourceSnippet?.trim() || null,
        masteryLevel: 0,
        nextReviewAt: new Date(),
      })),
    });
    savedCount = result.count;
  }

  const { total, savedWords } = await listSavedVocabulary(userId);

  return {
    savedCount,
    total,
    savedWords,
  };
}

export async function removeVocabulary(
  userId: string,
  word: string
): Promise<RemoveVocabularyResult> {
  const normalizedWord = normalizeWord(word);
  const result = normalizedWord
    ? await prisma.savedVocabulary.deleteMany({
        where: { userId, word: normalizedWord },
      })
    : { count: 0 };
  const { total, savedWords } = await listSavedVocabulary(userId);

  return {
    removedCount: result.count,
    total,
    savedWords,
  };
}
