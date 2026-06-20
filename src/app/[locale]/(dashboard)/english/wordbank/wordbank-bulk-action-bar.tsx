'use client';

import { FileDown, List } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import type { VocabularyListSummary } from '@/services/english/SavedVocabularyService';
import type { WordbankTranslator } from './wordbank-mastery';

export function BulkActionBar({
  selectedCount,
  lists,
  currentListId,
  isUpdating,
  onAssignList,
  onRemoveFromCurrentList,
  onMarkMastery,
  onExportCsv,
  t,
}: {
  selectedCount: number;
  lists: VocabularyListSummary[];
  currentListId: string;
  isUpdating: boolean;
  onAssignList: (listId: string) => void;
  onRemoveFromCurrentList: () => void;
  onMarkMastery: (level: number) => void;
  onExportCsv: () => void;
  t: WordbankTranslator;
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-2 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur">
      <Badge variant="secondary">
        {t('bulkSelected', { count: selectedCount })}
      </Badge>
      <NativeSelect
        aria-label={t('addToWordList')}
        className="w-48"
        defaultValue=""
        disabled={isUpdating}
        onChange={(event) => {
          if (!event.currentTarget.value) return;
          onAssignList(event.currentTarget.value);
          event.currentTarget.value = '';
        }}
      >
        <NativeSelectOption value="">{t('addToWordList')}</NativeSelectOption>
        {lists.map((list) => (
          <NativeSelectOption key={list.id} value={list.id}>
            {list.name}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isUpdating || currentListId === 'all'}
        onClick={onRemoveFromCurrentList}
      >
        <List data-icon="inline-start" />
        {t('removeFromWordList')}
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
