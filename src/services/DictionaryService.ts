import type { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';

export interface DictionaryMeaning {
  partOfSpeech: string;
  definition: string;
  example?: string;
}

export interface DictionaryEntry {
  word: string;
  phonetic: string | null;
  audioUrl: string | null;
  meanings: DictionaryMeaning[];
}

/**
 * Implement this interface to swap dictionary API providers.
 */
export interface DictionaryProvider {
  lookup(word: string): Promise<DictionaryEntry | null>;
}

/**
 * Default provider: Free Dictionary API (dictionaryapi.dev)
 */
class FreeDictionaryProvider implements DictionaryProvider {
  private baseUrl = 'https://api.dictionaryapi.dev/api/v2/entries/en';

  async lookup(word: string): Promise<DictionaryEntry | null> {
    const response = await fetch(
      `${this.baseUrl}/${encodeURIComponent(word)}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Dictionary service unavailable');
    }

    const data = await response.json();
    const entry = data[0];

    const phonetic =
      entry.phonetic ||
      entry.phonetics?.find((p: { text?: string }) => p.text)?.text ||
      null;

    const rawAudioUrl =
      entry.phonetics?.find((p: { audio?: string }) =>
        p.audio?.endsWith('.mp3')
      )?.audio || null;

    // Normalize protocol-relative URLs (//...) to https://
    const audioUrl = rawAudioUrl?.startsWith('//')
      ? `https:${rawAudioUrl}`
      : rawAudioUrl;

    const meanings: DictionaryMeaning[] = (entry.meanings || [])
      .slice(0, 2)
      .map(
        (m: {
          partOfSpeech: string;
          definitions: { definition: string; example?: string }[];
        }) => ({
          partOfSpeech: m.partOfSpeech,
          definition: m.definitions[0]?.definition || '',
          example: m.definitions[0]?.example || undefined,
        })
      );

    return { word, phonetic, audioUrl, meanings };
  }
}

const defaultProvider = new FreeDictionaryProvider();

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
   * Look up a word. Checks DB cache first, then falls back to the provider.
   */
  static async lookup(
    word: string,
    provider: DictionaryProvider = defaultProvider
  ): Promise<DictionaryEntry | null> {
    // Check cache
    const cached = await prisma.dictionaryCache.findUnique({
      where: { word },
    });

    if (cached) {
      return {
        word: cached.word,
        phonetic: cached.phonetic,
        audioUrl: cached.audioUrl,
        meanings: cached.meanings as unknown as DictionaryMeaning[],
      };
    }

    // Fetch from provider
    const entry = await provider.lookup(word);
    if (!entry) return null;

    // Cache the result
    await prisma.dictionaryCache.create({
      data: {
        word: entry.word,
        phonetic: entry.phonetic,
        audioUrl: entry.audioUrl,
        meanings: entry.meanings as unknown as Prisma.InputJsonValue,
      },
    });

    return entry;
  }
}
