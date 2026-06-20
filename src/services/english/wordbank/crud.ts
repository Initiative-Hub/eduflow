import { prisma } from '@/lib/prisma';
import { normalizeWord } from './mappers';
import { listSavedVocabulary } from './list';
import type {
  RemoveVocabularyResult,
  SaveVocabularyInput,
  SaveVocabularyResult,
} from './types';

export async function saveVocabulary(
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
        masteryLevel: 0,
        nextReviewAt: new Date(),
      })),
      skipDuplicates: true,
    });
  }

  const { total, savedWords } = await listSavedVocabulary(userId);

  return {
    savedCount: uniqueVocabulary.size,
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
