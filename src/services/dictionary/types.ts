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
  /** Additional rich data available from premium providers (MW) */
  etymology?: string;
  synonyms?: string[];
  antonyms?: string[];
  dateFirstUsed?: string;
  /** Short label like "noun", "verb" — the headword's functional label */
  functionalLabel?: string;
}

export interface DictionaryProvider {
  readonly id: DictionaryProviderId;
  lookup(word: string): Promise<DictionaryEntry | null>;
}

export type DictionaryProviderId =
  | 'free-dictionary'
  | 'mw-collegiate'
  | 'mw-learners';

export class DictionaryRateLimitError extends Error {
  constructor(public readonly providerId: DictionaryProviderId) {
    super(`Rate limit exceeded for dictionary provider: ${providerId}`);
    this.name = 'DictionaryRateLimitError';
  }
}

export interface AutocompleteSuggestion {
  select: string;
  link?: string;
  value?: string;
  phonetic?: string;
  definition?: string;
  data?: string;
}

export interface AutocompleteResult {
  query: string;
  suggestions: AutocompleteSuggestion[];
}

export interface WordExample {
  english: string;
  vietnamese: string;
}
