'use client';

import { BookMarked, Grid2X2, List, Loader2, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type {
  VocabularyListSummary,
  WordbankMasteryFilter,
  WordbankSort,
  WordbankStats,
} from '@/services/english/SavedVocabularyService';
import type { WordbankView } from './use-wordbank-display-preferences';
import type { WordbankTranslator } from './wordbank-mastery';

export function WordbankToolbar({
  search,
  listId,
  mastery,
  sort,
  view,
  practiceMode,
  stats,
  lists,
  isGeneratingReview,
  onSearchChange,
  onListChange,
  onMasteryChange,
  onSortChange,
  onViewChange,
  onPracticeModeChange,
  onGenerateReview,
  t,
}: {
  search: string;
  listId: string;
  mastery: WordbankMasteryFilter;
  sort: WordbankSort;
  view: WordbankView;
  practiceMode: boolean;
  stats: WordbankStats;
  lists: VocabularyListSummary[];
  isGeneratingReview: boolean;
  onSearchChange: (value: string) => void;
  onListChange: (value: string) => void;
  onMasteryChange: (value: WordbankMasteryFilter) => void;
  onSortChange: (value: WordbankSort) => void;
  onViewChange: (value: WordbankView) => void;
  onPracticeModeChange: (value: boolean) => void;
  onGenerateReview: () => void;
  t: WordbankTranslator;
}) {
  return (
    <div className="sticky top-0 z-10 -mx-2 flex flex-col gap-3 border-b bg-background/90 px-2 py-3 backdrop-blur md:-mx-4 md:px-4">
      <div className="grid gap-3 xl:grid-cols-[minmax(16rem,1fr)_auto_auto_auto] xl:items-center">
        <InputGroup className="h-11 rounded-xl bg-background">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            value={search}
            onChange={(event) => onSearchChange(event.currentTarget.value)}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchLabel')}
            className="text-base md:text-sm"
          />
        </InputGroup>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:flex">
          <NativeSelect
            value={listId}
            onChange={(event) => onListChange(event.currentTarget.value)}
            aria-label={t('wordLists')}
            className="min-w-40"
          >
            <NativeSelectOption value="all">
              {t('allWordLists')}
            </NativeSelectOption>
            {lists.map((list) => (
              <NativeSelectOption key={list.id} value={list.id}>
                {list.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <NativeSelect
            value={mastery}
            onChange={(event) =>
              onMasteryChange(
                event.currentTarget.value as WordbankMasteryFilter
              )
            }
            aria-label={t('masteryLabel')}
            className="min-w-40"
          >
            <NativeSelectOption value="all">
              {t('masteryAll')}
            </NativeSelectOption>
            <NativeSelectOption value="due">
              {t('masteryDue')}
            </NativeSelectOption>
            <NativeSelectOption value="0">{t('masteryNew')}</NativeSelectOption>
            <NativeSelectOption value="1">
              {t('masteryFamiliar')}
            </NativeSelectOption>
            <NativeSelectOption value="2">
              {t('masteryMastered')}
            </NativeSelectOption>
          </NativeSelect>
          <NativeSelect
            value={sort}
            onChange={(event) =>
              onSortChange(event.currentTarget.value as WordbankSort)
            }
            aria-label={t('sortLabel')}
            className="min-w-40"
          >
            <NativeSelectOption value="recent">
              {t('sortRecent')}
            </NativeSelectOption>
            <NativeSelectOption value="az">{t('sortAz')}</NativeSelectOption>
            <NativeSelectOption value="weakest">
              {t('sortWeakest')}
            </NativeSelectOption>
          </NativeSelect>
        </div>
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(value) => {
            if (value === 'grid' || value === 'list') onViewChange(value);
          }}
          variant="outline"
          size="sm"
          aria-label={t('viewLabel')}
        >
          <ToggleGroupItem value="grid" aria-label={t('gridView')}>
            <Grid2X2 />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label={t('listView')}>
            <List />
          </ToggleGroupItem>
        </ToggleGroup>
        <Button
          type="button"
          onClick={onGenerateReview}
          disabled={stats.dueWords === 0 || isGeneratingReview}
        >
          {isGeneratingReview ? (
            <Loader2 data-icon="inline-start" className="animate-spin" />
          ) : (
            <BookMarked data-icon="inline-start" />
          )}
          {t('generateDueQuiz')}
        </Button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-muted-foreground text-sm">
          <Badge variant="secondary">
            {t('savedWordsStat', { count: stats.savedWords })}
          </Badge>
          <Badge variant="outline">
            {t('savedTodayStat', { count: stats.savedToday })}
          </Badge>
          <Badge variant="outline">
            {t('dueWordsStat', { count: stats.dueWords })}
          </Badge>
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <Switch
            checked={practiceMode}
            onCheckedChange={onPracticeModeChange}
          />
          {t('practiceMode')}
        </label>
      </div>
    </div>
  );
}
