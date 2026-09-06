import type {
  DictionaryEntry,
  DictionaryMeaning,
  DictionaryProvider,
  DictionaryProviderId,
} from '../types';

export class FreeDictionaryProvider implements DictionaryProvider {
  readonly id: DictionaryProviderId = 'free-dictionary';
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
