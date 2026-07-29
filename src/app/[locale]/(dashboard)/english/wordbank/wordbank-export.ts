import type { SavedVocabularyItem } from '@/services/english/SavedVocabularyService';
import {
  createWordbankCsvArtifact,
  type WordbankExportLabels,
} from '@/utils/wordbank-csv';

export type { WordbankExportLabels };

export function downloadWordbankCsv(
  items: SavedVocabularyItem[],
  labels: WordbankExportLabels
) {
  const csv = createWordbankCsvArtifact(items, labels);
  const url = URL.createObjectURL(
    new Blob([csv.content], { type: csv.mimeType })
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = csv.fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
