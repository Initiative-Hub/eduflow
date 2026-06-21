'use client';

import { BookMarked, Grid2X2, List, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

function getCountLabel(
  label: string,
  count: number | undefined,
  t: WordbankTranslator
) {
  if (typeof count !== 'number') return label;

  return t('filterOptionWithCount', { label, count });
}

function WordbankFilterSelect({
  value,
  options,
  ariaLabel,
  className,
  onValueChange,
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  ariaLabel: string;
  className?: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        aria-label={ariaLabel}
        className={className}
        size="default"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        position="popper"
        className="bg-popover shadow-lg ring-border/80"
      >
        <SelectGroup>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="focus:bg-primary/10 focus:text-foreground focus:**:text-foreground! data-[state=checked]:bg-primary/10 data-[state=checked]:text-foreground data-[state=checked]:**:text-foreground!"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

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
  const listOptions = [
    {
      value: 'all',
      label: getCountLabel(t('allWordLists'), stats.savedWords, t),
    },
    ...lists.map((list) => ({
      value: list.id,
      label: getCountLabel(list.name, list.wordCount, t),
    })),
  ];
  const masteryOptions = [
    {
      value: 'all',
      label: getCountLabel(t('masteryAll'), stats.savedWords, t),
    },
    {
      value: 'due',
      label: getCountLabel(t('masteryDue'), stats.dueWords, t),
    },
    {
      value: '0',
      label: getCountLabel(t('masteryNew'), stats.newWords, t),
    },
    {
      value: '1',
      label: getCountLabel(t('masteryFamiliar'), stats.familiarWords, t),
    },
    {
      value: '2',
      label: getCountLabel(t('masteryMastered'), stats.masteredWords, t),
    },
  ];
  const sortOptions = [
    {
      value: 'recent',
      label: t('sortRecentWithSavedToday', { count: stats.savedToday }),
    },
    { value: 'az', label: t('sortAz') },
    { value: 'weakest', label: t('sortWeakest') },
  ];

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
          <WordbankFilterSelect
            value={listId}
            onValueChange={onListChange}
            ariaLabel={t('wordLists')}
            className="h-11 min-w-40 rounded-xl bg-background"
            options={listOptions}
          />
          <WordbankFilterSelect
            value={mastery}
            onValueChange={(value) =>
              onMasteryChange(value as WordbankMasteryFilter)
            }
            ariaLabel={t('masteryLabel')}
            className="h-11 min-w-40 rounded-xl bg-background"
            options={masteryOptions}
          />
          <WordbankFilterSelect
            value={sort}
            onValueChange={(value) => onSortChange(value as WordbankSort)}
            ariaLabel={t('sortLabel')}
            className="h-11 min-w-40 rounded-xl bg-background"
            options={sortOptions}
          />
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
      {view === 'grid' ? (
        <div className="flex justify-end">
          <label className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground">
            <Switch
              checked={practiceMode}
              onCheckedChange={onPracticeModeChange}
            />
            {t('practiceMode')}
          </label>
        </div>
      ) : null}
    </div>
  );
}
