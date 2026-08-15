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

export interface AutocompleteSuggestion {
  select: string;
  link?: string;
  value?: string;
  phonetic?: string;
  definition?: string;
  data?: string;
}

export interface AutocompleteResult {
  query: string;
  suggestions: AutocompleteSuggestion[];
}

export interface WordExample {
  english: string;
  vietnamese: string;
}

export interface CrawledExamplesResult {
  word: string;
  examples: WordExample[];
}

export interface PronunciationAssessmentResult {
  transcript: string;
  targetText: string;
  score: number;
  matchedWords: string[];
  missingWords: string[];
  feedback: string;
}

export const wordbankApi = {
  list(params: WordbankQueryParams = {}) {
    return apiClient.get<SavedVocabularyListResult>('v1/english/wordbank', {
      params: buildWordbankParams(params),
    });
  },
  autocomplete(query: string) {
    return apiClient.get<AutocompleteResult>('v1/dictionary/autocomplete', {
      params: { query },
    });
  },
  fetchExamples(word: string) {
    return apiClient.get<CrawledExamplesResult>('v1/dictionary/examples', {
      params: { word },
    });
  },
  assessPronunciation(audioBlob: Blob, targetText: string) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('targetText', targetText);

    return apiClient.post<PronunciationAssessmentResult>(
      'v1/english/pronunciation/assess',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
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
