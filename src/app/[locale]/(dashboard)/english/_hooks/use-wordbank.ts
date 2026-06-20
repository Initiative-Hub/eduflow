import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { VocabularyItem } from '@/services/english/VocabularyService';
import type {
  CreateVocabularyListInput,
  CreateReviewSessionInput,
  UpdateSavedVocabularyItemsInput,
} from '@/services/english/SavedVocabularyService';
import {
  type WordbankQueryParams,
  wordbankApi,
} from '../wordbank/wordbank.service';

export const WORDBANK_QUERY_KEY = ['english', 'wordbank'] as const;

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORDBANK_QUERY_KEY });
    },
  });
}

export function useRemoveVocabularyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (word: string) => wordbankApi.remove(word),
    onSuccess: () => {
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
    onSuccess: () => {
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
