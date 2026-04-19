import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/api-client';
import { toast } from 'sonner';
import type { Lesson } from './use-modules';

/**
 * Fetches the full lesson record (including content) for a given lessonId.
 * Separated from `useModules` because modules only carry lightweight lesson
 * summaries (no content) for sidebar/navigation use.
 */
export function useLesson(lessonId: string) {
  const query = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: () => apiClient.get<Lesson>(`/v1/lessons/${lessonId}`),
    enabled: !!lessonId,
  });

  return {
    lesson: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

/**
 * Mutation hook for saving lesson title and/or content.
 * Accepts `courseId` so it can invalidate the module list cache (which
 * includes lesson titles used in sidebars and navigation).
 */
export function useUpdateLesson(courseId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: {
      lessonId: string;
      title?: string;
      content?: Record<string, unknown>;
    }) =>
      apiClient.patch<Lesson>(`/v1/lessons/${data.lessonId}`, {
        title: data.title,
        content: data.content,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['modules', courseId] });
      queryClient.invalidateQueries({
        queryKey: ['lesson', variables.lessonId],
      });
      toast.success('Lesson saved successfully!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update lesson');
    },
  });

  return {
    isUpdatingLesson: mutation.isPending,
    handleUpdateLesson: mutation.mutate,
  };
}
