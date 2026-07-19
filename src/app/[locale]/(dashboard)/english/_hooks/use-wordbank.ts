import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  CreateReviewSessionInput,
  CreateVocabularyListInput,
  SavedVocabularyListResult,
  UpdateSavedVocabularyItemsInput,
  UpdateSavedVocabularyItemsResult,
} from '@/services/english/SavedVocabularyService';
import type { VocabularyItem } from '@/services/english/VocabularyService';
import {
  type WordbankQueryParams,
  wordbankApi,
} from '../wordbank/wordbank.service';

export const WORDBANK_QUERY_KEY = ['english', 'wordbank'] as const;

type WordbankMetadataResult = Partial<
  Pick<SavedVocabularyListResult, 'lists' | 'savedWords' | 'stats' | 'total'>
>;

function updateWordbankMetadataCaches(
  queryClient: QueryClient,
  result: WordbankMetadataResult
) {
  queryClient.setQueriesData<SavedVocabularyListResult>(
    { queryKey: WORDBANK_QUERY_KEY },
    (current) => {
      if (!current) return current;

      return {
        ...current,
        lists: result.lists ?? current.lists,
        savedWords: result.savedWords ?? current.savedWords,
        stats:
          result.stats ??
          (typeof result.total === 'number'
            ? { ...current.stats, savedWords: result.total }
            : current.stats),
        total: result.total ?? current.total,
      };
    }
  );
}

function updateWordbankItemMembershipCaches(
  queryClient: QueryClient,
  input: UpdateSavedVocabularyItemsInput,
  result: UpdateSavedVocabularyItemsResult
) {
  const addListIds = new Set(input.addListIds ?? []);
  const removeListIds = new Set(input.removeListIds ?? []);
  const vocabularyIds = new Set(input.vocabularyIds);

  if (addListIds.size === 0 && removeListIds.size === 0) {
    return;
  }

  queryClient.setQueriesData<SavedVocabularyListResult>(
    { queryKey: WORDBANK_QUERY_KEY },
    (current) => {
      if (!current) return current;

      const nextLists = result.lists ?? current.lists;
      const listsById = new Map(nextLists.map((list) => [list.id, list]));

      return {
        ...current,
        items: current.items.map((item) => {
          if (!vocabularyIds.has(item.id)) return item;

          const nextItemLists = item.lists
            .filter((list) => !removeListIds.has(list.id))
            .slice();

          for (const listId of addListIds) {
            const list = listsById.get(listId);
            if (
              list &&
              !nextItemLists.some((itemList) => itemList.id === listId)
            ) {
              nextItemLists.push(list);
            }
          }

          return { ...item, lists: nextItemLists };
        }),
        lists: nextLists,
      };
    }
  );
}

export function useWordbankQuery(params: WordbankQueryParams = {}) {
  return useQuery({
    queryKey: [...WORDBANK_QUERY_KEY, params],
    queryFn: () => wordbankApi.list(params),
  });
}

export function useSaveVocabularyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vocabulary: VocabularyItem[]) => wordbankApi.save(vocabulary),
    onSuccess: (result) => {
      updateWordbankMetadataCaches(queryClient, result);
      queryClient.invalidateQueries({ queryKey: WORDBANK_QUERY_KEY });
    },
  });
}

export function useRemoveVocabularyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (word: string) => wordbankApi.remove(word),
    onSuccess: (result) => {
      updateWordbankMetadataCaches(queryClient, result);
      queryClient.invalidateQueries({ queryKey: WORDBANK_QUERY_KEY });
    },
  });
}

export function useCreateVocabularyListMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateVocabularyListInput) =>
      wordbankApi.createList(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORDBANK_QUERY_KEY });
    },
  });
}

export function useUpdateVocabularyItemsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateSavedVocabularyItemsInput) =>
      wordbankApi.updateItems(input),
    onSuccess: (result, input) => {
      updateWordbankMetadataCaches(queryClient, result);
      updateWordbankItemMembershipCaches(queryClient, input, result);
      queryClient.invalidateQueries({ queryKey: WORDBANK_QUERY_KEY });
    },
  });
}

export function useCreateReviewSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateReviewSessionInput = {}) =>
      wordbankApi.createReviewSession(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORDBANK_QUERY_KEY });
    },
  });
}
