'use client';

import {
  ArrowLeft,
  BookMarked,
  BookmarkX,
  LibraryBig,
  Loader2,
  Search,
  Volume2,
} from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useDeferredValue, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  useRemoveVocabularyMutation,
  useWordbankQuery,
} from '../_hooks/use-wordbank';
import type { SavedVocabularyItem } from '@/services/english/SavedVocabularyService';
import {
  filterAndSortWordbankItems,
  getPartOfSpeechOptions,
  type WordbankSort,
} from './wordbank.utils';

function playAudio(audioUrl: string) {
  const safeUrl = audioUrl.startsWith('//') ? `https:${audioUrl}` : audioUrl;
  const audio = new Audio(safeUrl);
  audio.play().catch(() => {});
}

interface WordbankCardProps {
  item: SavedVocabularyItem;
  isRemoving: boolean;
  onRemoveWord: (word: string) => void;
  t: ReturnType<typeof useTranslations>;
}

function WordbankCard({
  item,
  isRemoving,
  onRemoveWord,
  t,
}: WordbankCardProps) {
  return (
    <Card className="min-h-80 rounded-xl">
      <CardHeader>
        <CardTitle className="flex flex-col gap-1">
          <span className="text-primary text-2xl">{item.word}</span>
          <span className="font-normal text-muted-foreground text-base">
            {item.partOfSpeech}
          </span>
        </CardTitle>
        <CardAction className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="icon-lg"
            className="rounded-full"
            onClick={() => item.audioUrl && playAudio(item.audioUrl)}
            disabled={!item.audioUrl}
            aria-label={t('playPronunciation', { word: item.word })}
          >
            <Volume2 className="size-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full text-muted-foreground hover:text-destructive"
            disabled={isRemoving}
            onClick={() => onRemoveWord(item.word)}
            aria-label={t('removeWord', { word: item.word })}
          >
            {isRemoving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <BookmarkX className="size-4" />
            )}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="font-mono text-muted-foreground text-base">
          {item.ipa ?? t('missingIpa')}
        </p>
        <div className="flex flex-col gap-2">
          <p className="text-foreground text-base leading-relaxed">
            {item.englishDefinition}
          </p>
          <p className="text-muted-foreground text-base italic leading-relaxed">
            {item.vietnameseTranslation}
          </p>
        </div>
        <blockquote className="border-primary/35 border-l-2 pl-4 text-muted-foreground text-base leading-relaxed">
          &ldquo;{item.exampleSentence}&rdquo;
        </blockquote>
      </CardContent>
    </Card>
  );
}

interface WordbankEmptyStateProps {
  hasSavedWords: boolean;
  t: ReturnType<typeof useTranslations>;
}

function WordbankEmptyState({ hasSavedWords, t }: WordbankEmptyStateProps) {
  return (
    <Empty className="min-h-80 border bg-background/70">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <LibraryBig className="size-4" />
        </EmptyMedia>
        <EmptyTitle>
          {hasSavedWords ? t('emptyFilterTitle') : t('emptyTitle')}
        </EmptyTitle>
        <EmptyDescription>
          {hasSavedWords ? t('emptyFilterDescription') : t('emptyDescription')}
        </EmptyDescription>
      </EmptyHeader>
      {hasSavedWords ? null : (
        <EmptyContent>
          <Button asChild>
            <Link href="/english">
              <BookMarked data-icon="inline-start" className="size-4" />
              {t('openEnglishAssistant')}
            </Link>
          </Button>
        </EmptyContent>
      )}
    </Empty>
  );
}

export function WordbankClient() {
  const t = useTranslations('WordbankPage');
  const [search, setSearch] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState('all');
  const [sort, setSort] = useState<WordbankSort>('recent');
  const deferredSearch = useDeferredValue(search);
  const wordbankQuery = useWordbankQuery();
  const removeWordMutation = useRemoveVocabularyMutation();

  const items = wordbankQuery.data?.items ?? [];
  const partOfSpeechOptions = useMemo(
    () => getPartOfSpeechOptions(items),
    [items]
  );
  const filteredItems = useMemo(
    () =>
      filterAndSortWordbankItems(items, {
        search: deferredSearch,
        partOfSpeech,
        sort,
      }),
    [deferredSearch, items, partOfSpeech, sort]
  );
  const savedTodayCount = useMemo(() => {
    const today = new Date().toDateString();
    return items.filter(
      (item) => new Date(item.savedAt).toDateString() === today
    ).length;
  }, [items]);

  async function handleRemoveWord(word: string) {
    try {
      await removeWordMutation.mutateAsync(word);
      toast.success(t('removedToast', { word }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Wordbank remove failed';
      toast.error(t('removeFailedToast'), { description: msg });
    }
  }

  return (
    <div className="flex flex-col gap-8 pb-16">
      <header className="flex flex-col gap-6">
        <div className="flex items-start gap-4">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="mt-2 min-h-11 min-w-11 rounded-full"
          >
            <Link href="/english" aria-label={t('backToEnglish')}>
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h1 className="flex items-center gap-2 font-bold text-3xl text-foreground tracking-tight">
              <BookMarked className="size-8 text-primary" />
              {t('title')}
            </h1>
            <p className="text-muted-foreground">
              {t('wordCount', { count: wordbankQuery.data?.total ?? 0 })}
            </p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-center">
          <InputGroup className="h-11 rounded-xl bg-background">
            <InputGroupAddon>
              <Search className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              placeholder={t('searchPlaceholder')}
              aria-label={t('searchLabel')}
              className="text-base md:text-sm"
            />
          </InputGroup>

          <NativeSelect
            value={partOfSpeech}
            onChange={(event) => setPartOfSpeech(event.currentTarget.value)}
            aria-label={t('partOfSpeechLabel')}
            className="w-full lg:w-48"
          >
            <NativeSelectOption value="all">
              {t('allPartsOfSpeech')}
            </NativeSelectOption>
            {partOfSpeechOptions.map((option) => (
              <NativeSelectOption key={option} value={option.toLowerCase()}>
                {option}
              </NativeSelectOption>
            ))}
          </NativeSelect>

          <ToggleGroup
            type="single"
            value={sort}
            onValueChange={(value) => {
              if (value === 'recent' || value === 'az') setSort(value);
            }}
            variant="outline"
            size="sm"
            className="w-full justify-start lg:w-auto"
            aria-label={t('sortLabel')}
          >
            <ToggleGroupItem value="recent">{t('sortRecent')}</ToggleGroupItem>
            <ToggleGroupItem value="az">{t('sortAz')}</ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border bg-background/80 px-4 py-3">
            <p className="font-semibold text-2xl text-foreground">
              {wordbankQuery.data?.total ?? 0}
            </p>
            <p className="text-muted-foreground text-sm">{t('savedWords')}</p>
          </div>
          <div className="rounded-xl border bg-background/80 px-4 py-3">
            <p className="font-semibold text-2xl text-foreground">
              {partOfSpeechOptions.length}
            </p>
            <p className="text-muted-foreground text-sm">
              {t('partsOfSpeech')}
            </p>
          </div>
          <div className="rounded-xl border bg-background/80 px-4 py-3">
            <p className="font-semibold text-2xl text-foreground">
              {savedTodayCount}
            </p>
            <p className="text-muted-foreground text-sm">{t('savedToday')}</p>
          </div>
        </div>
      </header>

      {wordbankQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-80 rounded-xl" />
          ))}
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item) => (
            <WordbankCard
              key={item.id}
              item={item}
              isRemoving={removeWordMutation.isPending}
              onRemoveWord={handleRemoveWord}
              t={t}
            />
          ))}
        </div>
      ) : (
        <WordbankEmptyState hasSavedWords={items.length > 0} t={t} />
      )}
    </div>
  );
}
