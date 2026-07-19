'use client';

import { BookOpen, FileDown, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type {
  SavedVocabularyItem,
  VocabularyListSummary,
} from '@/services/english/SavedVocabularyService';
import {
  WordbankListManager,
  type WordbankListMembership,
  type WordbankListUpdate,
} from './wordbank-list-manager';
import type { WordbankTranslator } from './wordbank-mastery';

export function BulkActionBar({
  selectedCount,
  selectedItems,
  lists,
  isUpdating,
  isGeneratingQuiz,
  onUpdateLists,
  onMarkMastery,
  onGenerateQuiz,
  onExportCsv,
  t,
}: {
  selectedCount: number;
  selectedItems: SavedVocabularyItem[];
  lists: VocabularyListSummary[];
  isUpdating: boolean;
  isGeneratingQuiz: boolean;
  onUpdateLists: (vocabularyIds: string[], update: WordbankListUpdate) => void;
  onMarkMastery: (level: number) => void;
  onGenerateQuiz: () => void;
  onExportCsv: () => void;
  t: WordbankTranslator;
}) {
  if (selectedCount === 0 || selectedItems.length === 0) return null;

  const selectedVocabularyIds = selectedItems.map((item) => item.id);

  function getBulkMembership(listId: string): WordbankListMembership {
    const membershipCount = selectedItems.filter((item) =>
      item.lists.some((list) => list.id === listId)
    ).length;

    if (membershipCount === 0) return false;
    if (membershipCount === selectedItems.length) return true;

    return 'indeterminate';
  }

  return (
    <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-2 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur">
      <Badge variant="secondary">
        {t('bulkSelected', { count: selectedCount })}
      </Badge>
      <WordbankListManager
        vocabularyIds={selectedVocabularyIds}
        lists={lists}
        disabled={isUpdating}
        getMembership={getBulkMembership}
        onUpdateLists={onUpdateLists}
        t={t}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isUpdating || isGeneratingQuiz}
        onClick={onGenerateQuiz}
      >
        {isGeneratingQuiz ? (
          <Loader2 data-icon="inline-start" className="animate-spin" />
        ) : (
          <BookOpen data-icon="inline-start" />
        )}
        {t('generateSelectedQuiz')}
      </Button>
      {[0, 1, 2].map((level) => (
        <Button
          key={level}
          type="button"
          variant="outline"
          size="sm"
          disabled={isUpdating}
          onClick={() => onMarkMastery(level)}
        >
          {level === 0
            ? t('markNew')
            : level === 1
              ? t('markFamiliar')
              : t('markMastered')}
        </Button>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={onExportCsv}>
        <FileDown data-icon="inline-start" />
        {t('exportCsv')}
      </Button>
    </div>
  );
}
