import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { VocabularyItem } from '@/services/english/VocabularyService';
import type {
  RemoveVocabularyResult,
  SavedVocabularyListResult,
  SaveVocabularyResult,
} from '@/services/english/SavedVocabularyService';

export const WORDBANK_QUERY_KEY = ['english', 'wordbank'] as const;

async function parseJsonError(res: Response, fallback: string) {
  const errBody = await res.json().catch(() => ({}));
  throw new Error(errBody.message ?? `${fallback} (${res.status})`);
}

export function useWordbankQuery() {
  return useQuery({
    queryKey: WORDBANK_QUERY_KEY,
    queryFn: async () => {
      const res = await fetch('/api/v1/english/wordbank', {
        cache: 'no-store',
      });

      if (!res.ok) {
        await parseJsonError(res, 'Wordbank request failed');
      }

      return res.json() as Promise<SavedVocabularyListResult>;
    },
  });
}

export function useSaveVocabularyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vocabulary: VocabularyItem[]) => {
      const res = await fetch('/api/v1/english/wordbank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vocabulary }),
        cache: 'no-store',
      });

      if (!res.ok) {
        await parseJsonError(res, 'Wordbank save failed');
      }

      return res.json() as Promise<SaveVocabularyResult>;
    },
    onSuccess: (result) => {
      queryClient.setQueryData<SavedVocabularyListResult>(
        WORDBANK_QUERY_KEY,
        (current) => ({
          items: current?.items ?? [],
          total: result.total,
          savedWords: result.savedWords,
        })
      );
      queryClient.invalidateQueries({ queryKey: WORDBANK_QUERY_KEY });
    },
  });
}

export function useRemoveVocabularyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (word: string) => {
      const res = await fetch('/api/v1/english/wordbank', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word }),
        cache: 'no-store',
      });

      if (!res.ok) {
        await parseJsonError(res, 'Wordbank remove failed');
      }

      return res.json() as Promise<RemoveVocabularyResult>;
    },
    onSuccess: (result) => {
      queryClient.setQueryData<SavedVocabularyListResult>(
        WORDBANK_QUERY_KEY,
        (current) => ({
          items:
            current?.items.filter((item) =>
              result.savedWords.includes(item.word)
            ) ?? [],
          total: result.total,
          savedWords: result.savedWords,
        })
      );
      queryClient.invalidateQueries({ queryKey: WORDBANK_QUERY_KEY });
    },
  });
}
