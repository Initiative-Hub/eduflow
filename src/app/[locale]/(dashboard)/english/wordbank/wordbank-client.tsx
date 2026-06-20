'use client';

import { ArrowLeft, BookMarked } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useDeferredValue, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useQueryClient } from '@tanstack/react-query';
import {
  WORDBANK_QUERY_KEY,
  useCreateReviewSessionMutation,
  useCreateVocabularyListMutation,
  useRemoveVocabularyMutation,
  useUpdateVocabularyItemsMutation,
  useWordbankQuery,
} from '../_hooks/use-wordbank';
import type {
  SubmitReviewSessionResult,
  WordbankMasteryFilter,
  WordbankReviewSessionResult,
  WordbankSort,
} from '@/services/english/SavedVocabularyService';
import {
  BulkActionBar,
  CreateWordListDialog,
  WordbankCard,
  WordbankListView,
  WordbankReviewDialog,
  WordbankToolbar,
} from './wordbank-components';
import {
  type WordbankView,
  useWordbankDisplayPreferences,
} from './use-wordbank-display-preferences';
import { WordbankEmptyState } from './wordbank-empty-state';
import {
  type WordbankExportLabels,
  downloadWordbankCsv,
} from './wordbank-export';

function readSort(value: string | null): WordbankSort {
  return value === 'az' || value === 'weakest' ? value : 'recent';
}

function readMastery(value: string | null): WordbankMasteryFilter {
  return value === 'due' || value === '0' || value === '1' || value === '2'
    ? value
    : 'all';
}

export function WordbankClient() {
  const t = useTranslations('WordbankPage');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { preferences, setPreferences } = useWordbankDisplayPreferences();
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [listId, setListId] = useState(searchParams.get('list') ?? 'all');
  const [mastery, setMastery] = useState<WordbankMasteryFilter>(
    readMastery(searchParams.get('mastery'))
  );
  const [sort, setSort] = useState<WordbankSort>(
    readSort(searchParams.get('sort'))
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [reviewSession, setReviewSession] =
    useState<WordbankReviewSessionResult | null>(null);
  const [reviewResult, setReviewResult] =
    useState<SubmitReviewSessionResult | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const deferredSearch = useDeferredValue(search);
  const wordbankQuery = useWordbankQuery({
    search: deferredSearch,
    listId,
    mastery,
    sort,
  });
  const removeWordMutation = useRemoveVocabularyMutation();
  const updateItemsMutation = useUpdateVocabularyItemsMutation();
  const createListMutation = useCreateVocabularyListMutation();
  const createReviewSessionMutation = useCreateReviewSessionMutation();

  const items = wordbankQuery.data?.items ?? [];
  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(item.id)),
    [items, selectedIds]
  );
  const stats = wordbankQuery.data?.stats ?? {
    savedWords: wordbankQuery.data?.total ?? 0,
    savedToday: 0,
    dueWords: 0,
  };
  const lists = wordbankQuery.data?.lists ?? [];
  const exportLabels = useMemo<WordbankExportLabels>(
    () => ({
      title: t('title'),
      word: t('columnWord'),
      pronunciation: t('columnPronunciation'),
      englishDefinition: t('columnEnglishDefinition'),
      vietnameseTranslation: t('columnVietnameseTranslation'),
      exampleSentence: t('columnExampleSentence'),
      mastery: t('masteryLabel'),
      wordLists: t('wordLists'),
    }),
    [t]
  );

  function updateUrl(next: {
    q?: string;
    list?: string;
    mastery?: WordbankMasteryFilter;
    sort?: WordbankSort;
  }) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('partOfSpeech');

    for (const [key, value] of Object.entries(next)) {
      const defaultValue =
        key === 'sort'
          ? 'recent'
          : key === 'q'
            ? ''
            : key === 'mastery'
              ? 'all'
              : 'all';

      if (!value || value === defaultValue) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }

    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  }

  async function handleRemoveWord(word: string) {
    try {
      await removeWordMutation.mutateAsync(word);
      toast.success(t('removedToast', { word }));
      setSelectedIds(new Set());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Wordbank remove failed';
      toast.error(t('removeFailedToast'), { description: msg });
    }
  }

  async function handleAssignList(vocabularyIds: string[], nextListId: string) {
    try {
      await updateItemsMutation.mutateAsync({
        vocabularyIds,
        addListIds: [nextListId],
      });
      toast.success(t('updatedToast'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Wordbank update failed';
      toast.error(t('updateFailedToast'), { description: msg });
    }
  }

  async function handleMarkMastery(level: number) {
    try {
      await updateItemsMutation.mutateAsync({
        vocabularyIds: Array.from(selectedIds),
        masteryLevel: level,
      });
      toast.success(t('updatedToast'));
      setSelectedIds(new Set());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Wordbank update failed';
      toast.error(t('updateFailedToast'), { description: msg });
    }
  }

  async function handleRemoveFromCurrentList() {
    if (listId === 'all') {
      toast.error(t('noWordListSelected'));
      return;
    }

    try {
      await updateItemsMutation.mutateAsync({
        vocabularyIds: Array.from(selectedIds),
        removeListIds: [listId],
      });
      toast.success(t('updatedToast'));
      setSelectedIds(new Set());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Wordbank update failed';
      toast.error(t('updateFailedToast'), { description: msg });
    }
  }

  async function handleCreateList(name: string) {
    try {
      await createListMutation.mutateAsync({ name, colorCode: null });
      toast.success(t('listCreatedToast'));
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Word List create failed';
      toast.error(t('listCreateFailedToast'), { description: msg });
    }
  }

  async function handleGenerateReview() {
    try {
      const session = await createReviewSessionMutation.mutateAsync({
        listId: listId === 'all' ? undefined : listId,
      });
      setReviewSession(session);
      setReviewResult(null);
      setReviewOpen(true);
      toast.success(t('reviewCreatedToast'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Review create failed';
      toast.error(t('reviewCreateFailedToast'), { description: msg });
    }
  }

  function handleToggleSelected(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleToggleAll() {
    setSelectedIds((current) =>
      items.every((item) => current.has(item.id))
        ? new Set()
        : new Set(items.map((item) => item.id))
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-16">
      <header className="flex items-start gap-4">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="mt-2 min-h-11 min-w-11"
        >
          <Link href="/english" aria-label={t('backToEnglish')}>
            <ArrowLeft />
          </Link>
        </Button>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <h1 className="flex items-center gap-2 text-wrap font-bold text-3xl text-foreground tracking-tight">
                <BookMarked className="size-8 text-primary" />
                {t('title')}
              </h1>
              <p className="text-muted-foreground">
                {t('wordCount', { count: wordbankQuery.data?.total ?? 0 })}
              </p>
            </div>
            <CreateWordListDialog
              isPending={createListMutation.isPending}
              onCreate={handleCreateList}
              t={t}
            />
          </div>
        </div>
      </header>

      <WordbankToolbar
        search={search}
        listId={listId}
        mastery={mastery}
        sort={sort}
        view={preferences.view}
        practiceMode={preferences.practiceMode}
        stats={stats}
        lists={lists}
        isGeneratingReview={createReviewSessionMutation.isPending}
        onSearchChange={(value) => {
          setSearch(value);
          updateUrl({ q: value });
        }}
        onListChange={(value) => {
          setListId(value);
          setSelectedIds(new Set());
          updateUrl({ list: value });
        }}
        onMasteryChange={(value) => {
          setMastery(value);
          updateUrl({ mastery: value });
        }}
        onSortChange={(value) => {
          setSort(value);
          updateUrl({ sort: value });
        }}
        onViewChange={(value: WordbankView) =>
          setPreferences((current) => ({ ...current, view: value }))
        }
        onPracticeModeChange={(value) =>
          setPreferences((current) => ({ ...current, practiceMode: value }))
        }
        onGenerateReview={handleGenerateReview}
        t={t}
      />

      {wordbankQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-80 rounded-xl" />
          ))}
        </div>
      ) : items.length > 0 ? (
        preferences.view === 'grid' ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <WordbankCard
                key={item.id}
                item={item}
                isRemoving={removeWordMutation.isPending}
                practiceMode={preferences.practiceMode}
                lists={lists}
                onRemoveWord={handleRemoveWord}
                onAssignList={handleAssignList}
                t={t}
              />
            ))}
          </div>
        ) : (
          <>
            <WordbankListView
              items={items}
              selectedIds={selectedIds}
              isRemoving={removeWordMutation.isPending}
              onToggleSelected={handleToggleSelected}
              onToggleAll={handleToggleAll}
              onRemoveWord={handleRemoveWord}
              t={t}
            />
            <BulkActionBar
              selectedCount={selectedIds.size}
              lists={lists}
              currentListId={listId}
              isUpdating={updateItemsMutation.isPending}
              onAssignList={(nextListId) =>
                void handleAssignList(Array.from(selectedIds), nextListId)
              }
              onRemoveFromCurrentList={() => void handleRemoveFromCurrentList()}
              onMarkMastery={(level) => void handleMarkMastery(level)}
              onExportCsv={() =>
                downloadWordbankCsv(selectedItems, exportLabels)
              }
              t={t}
            />
          </>
        )
      ) : (
        <WordbankEmptyState
          hasSavedWords={(wordbankQuery.data?.total ?? 0) > 0}
        />
      )}

      <WordbankReviewDialog
        session={reviewSession}
        result={reviewResult}
        open={reviewOpen}
        onOpenChange={(open) => {
          setReviewOpen(open);
          if (!open) setReviewResult(null);
        }}
        onComplete={(result) => {
          setReviewResult(result);
          queryClient.invalidateQueries({ queryKey: WORDBANK_QUERY_KEY });
        }}
        t={t}
      />
    </div>
  );
}
