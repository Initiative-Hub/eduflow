import type { SavedVocabularyItem } from '@/services/english/SavedVocabularyService';

export interface WordbankExportLabels {
  title: string;
  word: string;
  pronunciation: string;
  englishDefinition: string;
  vietnameseTranslation: string;
  exampleSentence: string;
  mastery: string;
  wordLists: string;
}

export function downloadWordbankCsv(
  items: SavedVocabularyItem[],
  labels: WordbankExportLabels
) {
  const headers = [
    labels.word,
    labels.pronunciation,
    labels.englishDefinition,
    labels.vietnameseTranslation,
    labels.exampleSentence,
    labels.mastery,
    labels.wordLists,
  ];
  const rows = items.map((item) => [
    item.word,
    item.ipa ?? '',
    item.englishDefinition,
    item.vietnameseTranslation,
    item.exampleSentence,
    String(item.masteryLevel),
    item.lists.map((list) => list.name).join('; '),
  ]);
  const csv = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')
    )
    .join('\n');
  const url = URL.createObjectURL(
    new Blob([csv], { type: 'text/csv;charset=utf-8' })
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `${labels.title.toLowerCase().replaceAll(' ', '-')}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
