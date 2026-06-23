'use client';

import { ListPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { VocabularyListSummary } from '@/services/english/SavedVocabularyService';
import type { WordbankTranslator } from './wordbank-mastery';

export type WordbankListMembership = boolean | 'indeterminate';

export interface WordbankListUpdate {
  addListIds?: string[];
  removeListIds?: string[];
}

export function WordbankListManager({
  vocabularyIds,
  lists,
  disabled,
  align = 'start',
  getMembership,
  onUpdateLists,
  t,
}: {
  vocabularyIds: string[];
  lists: VocabularyListSummary[];
  disabled?: boolean;
  align?: 'start' | 'center' | 'end';
  getMembership: (listId: string) => WordbankListMembership;
  onUpdateLists: (vocabularyIds: string[], update: WordbankListUpdate) => void;
  t: WordbankTranslator;
}) {
  const managerId =
    vocabularyIds.length === 1
      ? vocabularyIds[0]
      : `bulk-${vocabularyIds.length}`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={disabled}>
          <ListPlus data-icon="inline-start" />
          {t('manageLists')}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="w-64 bg-popover p-2 shadow-lg ring-border/80"
      >
        <div className="flex flex-col gap-1">
          <p className="px-2 py-1 font-medium text-muted-foreground text-xs">
            {t('manageLists')}
          </p>
          {lists.length > 0 ? (
            lists.map((list) => {
              const membership = getMembership(list.id);
              const nextUpdate =
                membership === true
                  ? { removeListIds: [list.id] }
                  : { addListIds: [list.id] };
              const checkboxId = `wordbank-list-${list.id}-${managerId}`;

              return (
                <div
                  key={list.id}
                  className="flex min-h-9 items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-primary/10 focus-within:bg-primary/10"
                >
                  <Checkbox
                    id={checkboxId}
                    checked={membership}
                    disabled={disabled}
                    onCheckedChange={() =>
                      onUpdateLists(vocabularyIds, nextUpdate)
                    }
                  />
                  <label
                    htmlFor={checkboxId}
                    className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 text-sm"
                  >
                    <span className="truncate">{list.name}</span>
                    {typeof list.wordCount === 'number' ? (
                      <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
                        {list.wordCount}
                      </span>
                    ) : null}
                  </label>
                </div>
              );
            })
          ) : (
            <p className="px-2 py-2 text-muted-foreground text-sm">
              {t('noListsAvailable')}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
