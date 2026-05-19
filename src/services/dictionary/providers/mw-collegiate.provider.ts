import {
  type DictionaryEntry,
  type DictionaryMeaning,
  type DictionaryProvider,
  type DictionaryProviderId,
  DictionaryRateLimitError,
} from '../types';

interface MWEntry {
  hwi?: { prs?: { mw?: string; sound?: { audio?: string } }[] };
  fl?: string;
  def?: { sseq: unknown[][] }[];
  et?: unknown[][];
  syns?: { pt: unknown[][] }[];
  ants?: { pt: unknown[][] }[];
  date?: string;
  shortdef?: string[];
  meta?: { id?: string; syns?: string[][]; ants?: string[][] };
}

/**
 * Merriam-Webster Collegiate Dictionary provider.
 * Uses the Collegiate API (v3) with audio pronunciation support.
 *
 * Audio URL format: https://media.merriam-webster.com/audio/prons/en/us/mp3/{subdirectory}/{audio}.mp3
 * Subdirectory rules:
 * - If audio begins with "bix", subdirectory is "bix"
 * - If audio begins with "gg", subdirectory is "gg"
 * - If audio begins with a number or punctuation, subdirectory is "number"
 * - Otherwise, subdirectory is the first letter of audio
 */
export class MWCollegiateProvider implements DictionaryProvider {
  readonly id: DictionaryProviderId = 'mw-collegiate';
  private baseUrl =
    'https://www.dictionaryapi.com/api/v3/references/collegiate/json';

  constructor(private apiKey: string) {}

  async lookup(word: string): Promise<DictionaryEntry | null> {
    const response = await fetch(
      `${this.baseUrl}/${encodeURIComponent(word)}?key=${this.apiKey}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      if (response.status === 404) return null;
      if (response.status === 429) {
        throw new DictionaryRateLimitError(this.id);
      }
      throw new Error('Merriam-Webster Collegiate service unavailable');
    }

    const data: (MWEntry | string)[] = await response.json();

    // If the response is an array of strings, it means suggestions (word not found)
    if (!data.length || typeof data[0] === 'string') {
      return null;
    }

    // Filter entries that match the searched word (MW may return related words)
    const matchingEntries = (data as MWEntry[]).filter(
      (entry) =>
        typeof entry === 'object' &&
        entry.meta?.id?.replace(/:\d+$/, '') === word
    );

    // Fall back to all object entries if meta.id filtering yields nothing
    const entries =
      matchingEntries.length > 0
        ? matchingEntries
        : (data.filter((e) => typeof e === 'object') as MWEntry[]);

    if (!entries.length) return null;

    const firstEntry = entries[0];

    // Extract phonetic from hwi.prs
    const phonetic = firstEntry.hwi?.prs?.[0]?.mw || null;

    // Extract audio URL
    const audioFile = firstEntry.hwi?.prs?.[0]?.sound?.audio || null;
    const audioUrl = audioFile ? this.buildAudioUrl(audioFile) : null;

    // Extract meanings from ALL matching entries (up to 6 total for rich display)
    const meanings: DictionaryMeaning[] = this.extractMeaningsFromEntries(
      entries,
      6
    );

    // Extract etymology
    const etymology = this.extractEtymology(firstEntry);

    // Extract synonyms and antonyms from meta
    const synonyms = firstEntry.meta?.syns?.flat().slice(0, 6) || [];
    const antonyms = firstEntry.meta?.ants?.flat().slice(0, 6) || [];

    // Extract date of first use
    const dateFirstUsed = firstEntry.date
      ? this.cleanMarkup(firstEntry.date)
      : undefined;

    const functionalLabel = firstEntry.fl || undefined;

    return {
      word,
      phonetic,
      audioUrl,
      meanings,
      etymology: etymology || undefined,
      synonyms: synonyms.length > 0 ? synonyms : undefined,
      antonyms: antonyms.length > 0 ? antonyms : undefined,
      dateFirstUsed: dateFirstUsed || undefined,
      functionalLabel,
    };
  }

  private buildAudioUrl(audio: string): string {
    let subdirectory: string;

    if (audio.startsWith('bix')) {
      subdirectory = 'bix';
    } else if (audio.startsWith('gg')) {
      subdirectory = 'gg';
    } else if (/^[0-9]|^[^a-zA-Z]/.test(audio)) {
      subdirectory = 'number';
    } else {
      subdirectory = audio[0];
    }

    return `https://media.merriam-webster.com/audio/prons/en/us/mp3/${subdirectory}/${audio}.mp3`;
  }

  /**
   * Extract meanings from multiple MW entries.
   * MW returns separate entries for each numbered definition of a word.
   * This collects senses across all entries to provide the full picture.
   */
  private extractMeaningsFromEntries(
    entries: MWEntry[],
    limit = 6
  ): DictionaryMeaning[] {
    const meanings: DictionaryMeaning[] = [];

    for (const entry of entries) {
      if (meanings.length >= limit) break;

      const partOfSpeech = entry.fl || 'unknown';
      const defs = entry.def;

      if (!defs?.length) continue;

      for (const defBlock of defs) {
        if (meanings.length >= limit) break;

        for (const senseGroup of defBlock.sseq || []) {
          if (meanings.length >= limit) break;

          for (const sense of senseGroup) {
            if (meanings.length >= limit) break;
            if (!Array.isArray(sense) || sense[0] !== 'sense') continue;

            const senseData = sense[1] as {
              dt?: unknown[][];
            };

            const definition = this.extractFullDefinitionText(senseData.dt);
            const example = this.extractExample(senseData.dt);

            if (definition) {
              meanings.push({
                partOfSpeech,
                definition,
                example: example || undefined,
              });
            }
          }
        }
      }
    }

    return meanings;
  }

  /**
   * Extract the full definition text from a dt block.
   * Concatenates all text segments (separated by {bc} = bold colon)
   * to preserve the complete definition as shown on the MW website.
   */
  private extractFullDefinitionText(dt?: unknown[][]): string | null {
    if (!dt) return null;

    const textParts: string[] = [];

    for (const item of dt) {
      if (Array.isArray(item) && item[0] === 'text') {
        textParts.push(this.cleanMarkup(item[1] as string));
      }
    }

    const combined = textParts.join(' ').trim();
    return combined || null;
  }

  private extractDefinitionText(dt?: unknown[][]): string | null {
    if (!dt) return null;

    for (const item of dt) {
      if (Array.isArray(item) && item[0] === 'text') {
        return this.cleanMarkup(item[1] as string);
      }
    }
    return null;
  }

  private extractExample(dt?: unknown[][]): string | null {
    if (!dt) return null;

    for (const item of dt) {
      if (Array.isArray(item) && item[0] === 'vis') {
        const examples = item[1] as { t: string }[];
        if (examples?.[0]?.t) {
          return this.cleanMarkup(examples[0].t);
        }
      }
    }
    return null;
  }

  private extractEtymology(entry: MWEntry): string | null {
    if (!entry.et?.length) return null;

    for (const item of entry.et) {
      if (Array.isArray(item) && item[0] === 'text') {
        return this.cleanMarkup(item[1] as string);
      }
    }
    return null;
  }

  /**
   * Remove Merriam-Webster markup tokens from text.
   * Common tokens: {bc} (bold colon = ": "), {it}...{/it} (italic),
   * {wi}...{/wi} (word illustration), {sx|...||}  (synonym cross-ref),
   * {a_link|...} (link), {d_link|...|...} (definition link)
   */
  private cleanMarkup(text: string): string {
    return text
      .replace(/\{bc\}/g, ': ')
      .replace(/\{it\}(.*?)\{\/it\}/g, '$1')
      .replace(/\{wi\}(.*?)\{\/wi\}/g, '$1')
      .replace(/\{sx\|([^|]*)\|\|?\}/g, '$1')
      .replace(/\{a_link\|([^}]*)\}/g, '$1')
      .replace(/\{d_link\|([^|]*)\|[^}]*\}/g, '$1')
      .replace(/\{[^}]*\}/g, '')
      .replace(/^:\s*/, '') // Remove leading colon from definition start
      .trim();
  }
}
