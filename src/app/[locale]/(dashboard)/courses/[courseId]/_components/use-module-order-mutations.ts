'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/api-client';

interface ReorderPayload {
  items: { id: string; orderIndex: number }[];
}

interface IndentPayload {
  itemId: string;
  indent: number;
}

export function useModuleOrderMutations(moduleId: string, courseId: string) {
  const queryClient = useQueryClient();

  const reorderMutation = useMutation({
    mutationFn: (payload: ReorderPayload) =>
      apiClient.patch<{ message: string }>(
        `/v1/modules/${moduleId}/order`,
        payload
      ),
    onSuccess: () => {
      // Invalidate module queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['modules', courseId] });
    },
    onError: (error) => {
      console.error('Failed to persist reorder:', error);
      // On error, invalidate to refetch the correct state
      queryClient.invalidateQueries({ queryKey: ['modules', courseId] });
    },
  });

  const indentMutation = useMutation({
    mutationFn: (payload: IndentPayload) =>
      apiClient.patch<{ message: string }>(
        `/v1/modules/${moduleId}/indent`,
        payload
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules', courseId] });
    },
    onError: (error) => {
      console.error('Failed to persist indent:', error);
      queryClient.invalidateQueries({ queryKey: ['modules', courseId] });
    },
  });

  return { reorderMutation, indentMutation };
}
