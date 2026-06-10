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

    // Replace MW proprietary phonetic notation with Free Dictionary API's IPA.
    // MW Collegiate uses its own notation (e.g. "ˈkän-ˌtekst"), not IPA.
    // MW Learners uses a non-standard IPA variant. Both are replaced here.
    const aiIpa = await DictionaryService.generateIPA(word);
    const enrichedEntry: DictionaryEntry = {
      ...entry,
      phonetic: aiIpa ?? entry.phonetic,
    };

    // Cache the result — store full entry data in meanings JSON
    const cachePayload = {
      meanings: enrichedEntry.meanings,
      ...(enrichedEntry.etymology && { etymology: enrichedEntry.etymology }),
      ...(enrichedEntry.synonyms?.length && {
        synonyms: enrichedEntry.synonyms,
      }),
      ...(enrichedEntry.antonyms?.length && {
        antonyms: enrichedEntry.antonyms,
      }),
      ...(enrichedEntry.dateFirstUsed && {
        dateFirstUsed: enrichedEntry.dateFirstUsed,
      }),
      ...(enrichedEntry.functionalLabel && {
        functionalLabel: enrichedEntry.functionalLabel,
      }),
    };

    await prisma.dictionaryCache.create({
      data: {
        word: enrichedEntry.word,
        source: providerId,
        phonetic: enrichedEntry.phonetic,
        audioUrl: enrichedEntry.audioUrl,
        meanings: cachePayload as unknown as Prisma.InputJsonValue,
      },
    });

    return enrichedEntry;
  }

  /**
   * Fetch standard IPA phonemic transcription for a word from Free Dictionary IPA.
   * Returns the IPA string (e.g. /ˈkɑːn.tɛkst/) or null on failure.
   * This is best-effort — callers should fall back to the provider's phonetic.
   */
  private static async generateIPA(word: string): Promise<string | null> {
    try {
      const response = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
        { cache: 'no-store' }
      );

      if (!response.ok) return null;

      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) return null;

      const entry = data[0];
      const phonetic =
        entry.phonetic ||
        entry.phonetics?.find((p: { text?: string }) => p.text)?.text ||
        null;

      return phonetic;
    } catch {
      return null;
    }
  }
}
