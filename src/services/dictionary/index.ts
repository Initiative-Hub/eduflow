import type { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import {
  FreeDictionaryProvider,
  MWCollegiateProvider,
  MWLearnersProvider,
} from './providers';
import {
  type DictionaryEntry,
  type DictionaryMeaning,
  type DictionaryProvider,
  type DictionaryProviderId,
  DictionaryRateLimitError,
} from './types';

export type { DictionaryEntry, DictionaryMeaning, DictionaryProviderId };
export { DictionaryRateLimitError };

/**
 * Registry of all available dictionary providers.
 * Providers are lazily instantiated based on available API keys.
 */
function getProvider(id: DictionaryProviderId): DictionaryProvider {
  switch (id) {
    case 'free-dictionary':
      return new FreeDictionaryProvider();
    case 'mw-collegiate': {
      const apiKey = process.env.MERRIAM_WEBSTER_COLLEGIATE_API_KEY;
      if (!apiKey) {
        throw new Error(
          'MERRIAM_WEBSTER_COLLEGIATE_API_KEY environment variable is not set'
        );
      }
      return new MWCollegiateProvider(apiKey);
    }
    case 'mw-learners': {
      const apiKey = process.env.MERRIAM_WEBSTER_LEARNERS_API_KEY;
      if (!apiKey) {
        throw new Error(
          'MERRIAM_WEBSTER_LEARNERS_API_KEY environment variable is not set'
        );
      }
      return new MWLearnersProvider(apiKey);
    }
  }
}

export class DictionaryService {
  /**
   * Clean and validate a raw word input.
   * Returns null if the word is invalid.
   */
  static cleanWord(raw: string): string | null {
    const word = raw
      .toLowerCase()
      .trim()
      .replace(/[^a-z'-]/g, '');
    if (!word || word.length < 2) return null;
    return word;
  }

  /**
   * Look up a word using the specified provider.
   * Checks DB cache first (per provider), then falls back to the API.
   */
  static async lookup(
    word: string,
    providerId: DictionaryProviderId = 'free-dictionary'
  ): Promise<DictionaryEntry | null> {
    // Check cache (scoped by provider)
    const cached = await prisma.dictionaryCache.findUnique({
      where: { word_source: { word, source: providerId } },
    });

    if (cached) {
      const cachedMeanings = cached.meanings as Record<string, unknown>;

      // Support both legacy format (array of meanings) and new format (full entry data)
      if (Array.isArray(cachedMeanings)) {
        return {
          word: cached.word,
          phonetic: cached.phonetic,
          audioUrl: cached.audioUrl,
          meanings: cachedMeanings as unknown as DictionaryMeaning[],
        };
      }

      // New format: full entry stored in meanings JSON
      return {
        word: cached.word,
        phonetic: cached.phonetic,
        audioUrl: cached.audioUrl,
        meanings: (cachedMeanings.meanings as DictionaryMeaning[]) || [],
        etymology: cachedMeanings.etymology as string | undefined,
        synonyms: cachedMeanings.synonyms as string[] | undefined,
        antonyms: cachedMeanings.antonyms as string[] | undefined,
        dateFirstUsed: cachedMeanings.dateFirstUsed as string | undefined,
        functionalLabel: cachedMeanings.functionalLabel as string | undefined,
      };
    }

    // Fetch from provider (may throw DictionaryRateLimitError)
    const provider = getProvider(providerId);
    const entry = await provider.lookup(word);
    if (!entry) return null;

    // Cache the result — store full entry data in meanings JSON
    const cachePayload = {
      meanings: entry.meanings,
      ...(entry.etymology && { etymology: entry.etymology }),
      ...(entry.synonyms?.length && { synonyms: entry.synonyms }),
      ...(entry.antonyms?.length && { antonyms: entry.antonyms }),
      ...(entry.dateFirstUsed && { dateFirstUsed: entry.dateFirstUsed }),
      ...(entry.functionalLabel && { functionalLabel: entry.functionalLabel }),
    };

    await prisma.dictionaryCache.create({
      data: {
        word: entry.word,
        source: providerId,
        phonetic: entry.phonetic,
        audioUrl: entry.audioUrl,
        meanings: cachePayload as unknown as Prisma.InputJsonValue,
      },
    });

    return entry;
  }
}
