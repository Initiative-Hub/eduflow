import {
  type DictionaryEntry,
  type DictionaryMeaning,
  type DictionaryProvider,
  type DictionaryProviderId,
  DictionaryRateLimitError,
} from '../types';

interface MWLearnersEntry {
  hwi?: { prs?: { ipa?: string; sound?: { audio?: string } }[] };
  altprs?: { ipa?: string; sound?: { audio?: string } }[];
  fl?: string;
  def?: { sseq: unknown[][] }[];
  et?: unknown[][];
  date?: string;
  shortdef?: string[];
  meta?: { id?: string; syns?: string[][]; ants?: string[][] };
}

/**
 * Merriam-Webster Learner's Dictionary provider.
 * Uses the Learner's API (v3) with IPA pronunciation and audio support.
 *
 * Audio URL format: https://media.merriam-webster.com/audio/prons/en/us/mp3/{subdirectory}/{audio}.mp3
 */
export class MWLearnersProvider implements DictionaryProvider {
  readonly id: DictionaryProviderId = 'mw-learners';
  private baseUrl =
    'https://www.dictionaryapi.com/api/v3/references/learners/json';

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
      throw new Error("Merriam-Webster Learner's service unavailable");
    }

    const data: (MWLearnersEntry | string)[] = await response.json();

    // If the response is an array of strings, it means suggestions (word not found)
    if (!data.length || typeof data[0] === 'string') {
      return null;
    }

    // Filter entries that match the searched word (MW may return related words)
    const matchingEntries = (data as MWLearnersEntry[]).filter(
      (entry) =>
        typeof entry === 'object' &&
        entry.meta?.id?.replace(/:\d+$/, '').toLowerCase() ===
          word.toLowerCase()
    );

    // Fall back to all object entries if meta.id filtering yields nothing
    const entries =
      matchingEntries.length > 0
        ? matchingEntries
        : (data.filter((e) => typeof e === 'object') as MWLearnersEntry[]);

    if (!entries.length) return null;

    const firstEntry = entries[0];

    // Combine hwi.prs and altprs lists
    const prsList = [
      ...(firstEntry.hwi?.prs || []),
      ...(firstEntry.altprs || []),
    ];

    // Extract IPA phonetic from combined list — use only the first variant
    const phonetics = prsList.map((p) => p.ipa).filter(Boolean) ?? [];
    const phonetic = phonetics.length > 0 ? (phonetics[0] ?? null) : null;

    // Extract audio URL by finding the first available audio file in prsList
    const audioFile = prsList.find((p) => p.sound?.audio)?.sound?.audio ?? null;
    const audioUrl = audioFile ? this.buildAudioUrl(audioFile) : null;

    // Extract meanings from ALL matching entries
    const meanings: DictionaryMeaning[] =
      this.extractMeaningsFromEntries(entries);

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
   * Extract meanings from multiple MW Learners entries.
   * MW returns separate entries for each numbered definition of a word.
   */
  private extractMeaningsFromEntries(
    entries: MWLearnersEntry[],
    limit?: number
  ): DictionaryMeaning[] {
    const meanings: DictionaryMeaning[] = [];

    for (const entry of entries) {
      if (limit !== undefined && meanings.length >= limit) break;

      const partOfSpeech = entry.fl || 'unknown';
      const defs = entry.def;

      if (!defs?.length) continue;

      for (const defBlock of defs) {
        if (limit !== undefined && meanings.length >= limit) break;

        for (const senseGroup of defBlock.sseq || []) {
          if (limit !== undefined && meanings.length >= limit) break;

          for (const sense of senseGroup) {
            if (limit !== undefined && meanings.length >= limit) break;
            this.processSense(sense, partOfSpeech, meanings, limit);
          }
        }
      }

      // Fallback to shortdef if no definitions extracted for this entry
      if (!meanings.length && entry.shortdef?.length) {
        for (const def of entry.shortdef) {
          if (limit !== undefined && meanings.length >= limit) break;
          meanings.push({
            partOfSpeech,
            definition: this.cleanMarkup(def),
          });
        }
      }
    }

    return meanings;
  }

  /**
   * Recursively process MW senses (supporting sense, sen, bs, pseq)
   */
  private processSense(
    sense: unknown,
    partOfSpeech: string,
    meanings: DictionaryMeaning[],
    limit?: number
  ): void {
    if (limit !== undefined && meanings.length >= limit) return;
    if (!Array.isArray(sense)) return;

    const [type, data] = sense;

    if (type === 'sense' || type === 'sen') {
      const senseData = data as {
        dt?: unknown[][];
        sdsense?: {
          sd?: string;
          dt?: unknown[][];
        };
      };

      if (senseData) {
        let definition = this.extractDefinitionText(senseData.dt);

        // Handle sdsense (divided sense)
        if (senseData.sdsense?.dt) {
          const sdDivider = senseData.sdsense.sd
            ? `: ${senseData.sdsense.sd} `
            : ': ';
          const sdsenseDef = this.extractDefinitionText(senseData.sdsense.dt);
          if (sdsenseDef) {
            definition = definition
              ? `${definition}${sdDivider}${sdsenseDef}`
              : sdsenseDef;
          }
        }

        const example = this.extractExampleFromSense(senseData);

        if (definition) {
          meanings.push({
            partOfSpeech,
            definition,
            example: example || undefined,
          });
        }
      }
    } else if (type === 'bs') {
      // Binding substitute
      const nestedSense = data?.sense;
      if (nestedSense) {
        let definition = this.extractDefinitionText(nestedSense.dt);

        // Handle nested sdsense
        if (nestedSense.sdsense?.dt) {
          const sdDivider = nestedSense.sdsense.sd
            ? `: ${nestedSense.sdsense.sd} `
            : ': ';
          const sdsenseDef = this.extractDefinitionText(nestedSense.sdsense.dt);
          if (sdsenseDef) {
            definition = definition
              ? `${definition}${sdDivider}${sdsenseDef}`
              : sdsenseDef;
          }
        }

        const example = this.extractExampleFromSense(nestedSense);

        if (definition) {
          meanings.push({
            partOfSpeech,
            definition,
            example: example || undefined,
          });
        }
      }
    } else if (type === 'pseq') {
      // Parenthesized sense sequence
      if (Array.isArray(data)) {
        for (const nested of data) {
          this.processSense(nested, partOfSpeech, meanings, limit);
        }
      }
    }
  }

  private extractExampleFromSense(senseData: {
    dt?: unknown[][];
    sdsense?: { dt?: unknown[][] };
  }): string | null {
    let example = this.extractExampleFromDt(senseData.dt);
    if (example) return example;

    if (senseData.sdsense?.dt) {
      example = this.extractExampleFromDt(senseData.sdsense.dt);
      if (example) return example;
    }

    return null;
  }

  private extractExampleFromDt(dt?: unknown[][]): string | null {
    if (!dt) return null;

    for (const item of dt) {
      if (!Array.isArray(item)) continue;

      const type = item[0];
      const data = item[1];

      // Direct verbal illustration
      if (type === 'vis' && Array.isArray(data)) {
        const examples = data as { t: string }[];
        if (examples?.[0]?.t) {
          return this.cleanMarkup(examples[0].t);
        }
      }

      // Usage note sequence (uns)
      if (type === 'uns' && Array.isArray(data)) {
        for (const unsItem of data) {
          if (
            Array.isArray(unsItem) &&
            unsItem[0] === 'vis' &&
            Array.isArray(unsItem[1])
          ) {
            const examples = unsItem[1] as { t: string }[];
            if (examples?.[0]?.t) {
              return this.cleanMarkup(examples[0].t);
            }
          }
        }
      }

      // Sense note (snote)
      if (type === 'snote' && Array.isArray(data)) {
        for (const snoteItem of data) {
          if (
            Array.isArray(snoteItem) &&
            snoteItem[0] === 'vis' &&
            Array.isArray(snoteItem[1])
          ) {
            const examples = snoteItem[1] as { t: string }[];
            if (examples?.[0]?.t) {
              return this.cleanMarkup(examples[0].t);
            }
          }
        }
      }
    }

    return null;
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

  private extractEtymology(entry: MWLearnersEntry): string | null {
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
   */
  private cleanMarkup(text: string): string {
    return text
      .replace(/\{bc\}/g, ': ')
      .replace(/\{it\}(.*?)\{\/it\}/g, '$1')
      .replace(/\{wi\}(.*?)\{\/wi\}/g, '$1')
      .replace(/\{sx\|([^|]*)\|\|?\}/g, '$1')
      .replace(/\{a_link\|([^}]*)\}/g, '$1')
      .replace(/\{d_link\|([^|]*)\|[^}]*\}/g, '$1')
      .replace(/\{phrase\}(.*?)\{\/phrase\}/g, '$1')
      .replace(/\{[^}]*\}/g, '')
      .replace(/^:\s*/, '') // Remove leading colon from definition start
      .trim();
  }
}
