import { DictionaryService } from '@/services/dictionary';
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
    const enrichedVocabulary = await Promise.all(
      normalizedVocabulary.map(async ({ word, item }) => {
        let ipa = item.ipa?.trim() || null;
        let audioUrl = item.audioUrl?.trim() || null;
        let exampleSentence = item.exampleSentence.trim();
        let examples = item.examples ?? [];

        const isGenericExample =
          !exampleSentence ||
          exampleSentence.toLowerCase().startsWith('example sentence for') ||
          exampleSentence.toLowerCase() === word;

        const needsEnrichment = !ipa || isGenericExample;

        if (needsEnrichment) {
          try {
            const laban = await DictionaryService.fetchLabanDetails(word);
            if (!ipa && laban.ipa) {
              ipa = laban.ipa;
            }
            if (!audioUrl && laban.audioUrl) {
              audioUrl = laban.audioUrl;
            }
            if (laban.examples && laban.examples.length > 0) {
              const formatted = laban.examples.map((ex) =>
                ex.vietnamese
                  ? `"${ex.english}" — ${ex.vietnamese}`
                  : `"${ex.english}"`
              );
              if (examples.length === 0) {
                examples = formatted;
              }
              if (isGenericExample) {
                exampleSentence = formatted[0];
              }
            }
          } catch {
            // Gracefully retain existing values
          }
        }

        return {
          word,
          item: {
            ...item,
            ipa,
            audioUrl,
            exampleSentence,
            examples,
          },
        };
      })
    );

    const result = await prisma.savedVocabulary.createMany({
      data: enrichedVocabulary.map(({ word, item }) => ({
        userId,
        word,
        partOfSpeech: item.partOfSpeech.trim(),
        ipa: item.ipa?.trim() || null,
        audioUrl: item.audioUrl?.trim() || null,
        englishDefinition: item.englishDefinition.trim(),
        vietnameseTranslation: item.vietnameseTranslation.trim(),
        exampleSentence: item.exampleSentence.trim(),
        examples: item.examples ?? [],
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
