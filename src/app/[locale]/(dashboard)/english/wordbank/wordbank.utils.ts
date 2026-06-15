import type { SavedVocabularyItem } from '@/services/english/SavedVocabularyService';

export type WordbankSort = 'recent' | 'az';

export interface WordbankFilters {
  search: string;
  partOfSpeech: string;
  sort: WordbankSort;
}

export function filterAndSortWordbankItems(
  items: SavedVocabularyItem[],
  filters: WordbankFilters
) {
  const normalizedSearch = filters.search.trim().toLowerCase();
  const normalizedPartOfSpeech = filters.partOfSpeech.toLowerCase();

  const filtered = items.filter((item) => {
    const matchesPartOfSpeech =
      normalizedPartOfSpeech === 'all' ||
      item.partOfSpeech.toLowerCase() === normalizedPartOfSpeech;

    if (!matchesPartOfSpeech) return false;
    if (!normalizedSearch) return true;

    return [
      item.word,
      item.partOfSpeech,
      item.englishDefinition,
      item.vietnameseTranslation,
      item.exampleSentence,
    ].some((value) => value.toLowerCase().includes(normalizedSearch));
  });

  return filtered.toSorted((first, second) => {
    if (filters.sort === 'az') {
      return first.word.localeCompare(second.word);
    }

    return (
      new Date(second.savedAt).getTime() - new Date(first.savedAt).getTime()
    );
  });
}

export function getPartOfSpeechOptions(items: SavedVocabularyItem[]) {
  return Array.from(
    new Set(items.map((item) => item.partOfSpeech.trim()).filter(Boolean))
  ).toSorted((first, second) => first.localeCompare(second));
}
