import { apiClient } from '@/lib/api/api-client';
import type {
  CreateReviewSessionInput,
  CreateVocabularyListInput,
  RemoveVocabularyResult,
  SavedVocabularyListResult,
  SaveVocabularyResult,
  UpdateSavedVocabularyItemsInput,
  UpdateSavedVocabularyItemsResult,
  VocabularyListSummary,
  WordbankMasteryFilter,
  WordbankReviewSessionResult,
  WordbankSort,
} from '@/services/english/SavedVocabularyService';
import type { VocabularyItem } from '@/services/english/VocabularyService';

export interface WordbankQueryParams {
  search?: string;
  listId?: string;
  mastery?: WordbankMasteryFilter;
  sort?: WordbankSort;
}

function buildWordbankParams(params: WordbankQueryParams = {}) {
  const queryParams: Record<string, string> = {};

  if (params.search?.trim()) queryParams.q = params.search.trim();
  if (params.listId && params.listId !== 'all') {
    queryParams.list = params.listId;
  }
  if (params.mastery && params.mastery !== 'all') {
    queryParams.mastery = params.mastery;
  }
  if (params.sort && params.sort !== 'recent') {
    queryParams.sort = params.sort;
  }

  return queryParams;
}

export const wordbankApi = {
  list(params: WordbankQueryParams = {}) {
    return apiClient.get<SavedVocabularyListResult>('v1/english/wordbank', {
      params: buildWordbankParams(params),
    });
  },
  save(vocabulary: VocabularyItem[]) {
    return apiClient.post<SaveVocabularyResult>('v1/english/wordbank', {
      vocabulary,
    });
  },
  remove(word: string) {
    return apiClient.delete<RemoveVocabularyResult>('v1/english/wordbank', {
      data: { word },
    });
  },
  createList(input: CreateVocabularyListInput) {
    return apiClient.post<{ list: VocabularyListSummary }>(
      'v1/english/wordbank/lists',
      input
    );
  },
  updateItems(input: UpdateSavedVocabularyItemsInput) {
    return apiClient.patch<UpdateSavedVocabularyItemsResult>(
      'v1/english/wordbank/items',
      input
    );
  },
  createReviewSession(input: CreateReviewSessionInput = {}) {
    return apiClient.post<WordbankReviewSessionResult>(
      'v1/english/wordbank/review-sessions',
      input
    );
  },
};
