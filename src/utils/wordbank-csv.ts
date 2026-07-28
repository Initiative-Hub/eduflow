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

export interface WordbankCsvArtifact {
  content: string;
  fileName: string;
  mimeType: 'text/csv;charset=utf-8';
}

export function createWordbankCsvArtifact(
  items: SavedVocabularyItem[],
  labels: WordbankExportLabels
): WordbankCsvArtifact {
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
    .join('\r\n');

  return {
    content: `\uFEFF${csv}`,
    fileName: `${slugifyFilename(labels.title)}-${formatLocalTimestamp(
      new Date()
    )}.csv`,
    mimeType: 'text/csv;charset=utf-8',
  };
}

function slugifyFilename(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '');

  return slug || 'wordbank';
}

function formatLocalTimestamp(date: Date) {
  const day = padDatePart(date.getDate());
  const month = padDatePart(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = padDatePart(date.getHours());
  const minutes = padDatePart(date.getMinutes());

  return `${day}-${month}-${year}-${hours}-${minutes}`;
}

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}
