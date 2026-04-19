import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/api-client';
import { toast } from 'sonner';

export interface Lesson {
  id: string;
  title: string;
  orderIndex: number;
  content: Record<string, unknown> | null;
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  orderIndex: number;
  lessons: Lesson[];
}

/**
 * Fetches modules (with lightweight lesson summaries) for a course and
 * exposes mutations for creating modules and lessons.
 *
 * Note: `useLesson` and `useUpdateLesson` live in `./use-lesson.ts` so that
 * the lesson detail page doesn't pull in the full module mutation surface.
 */
export function useModules(courseId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['modules', courseId],
    queryFn: () => apiClient.get<Module[]>(`/v1/courses/${courseId}/modules`),
    enabled: !!courseId,
  });

  const createModuleMutation = useMutation({
    mutationFn: (data: { title: string }) =>
      apiClient.post<Module>(`/v1/courses/${courseId}/modules`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules', courseId] });
      toast.success('Module created successfully!');
    },
    onError: () => {
      toast.error('Failed to create module');
    },
  });

  const createLessonMutation = useMutation({
    mutationFn: (data: { moduleId: string; title: string }) =>
      apiClient.post<Lesson>(`/v1/modules/${data.moduleId}/lessons`, {
        title: data.title,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules', courseId] });
      toast.success('Lesson created successfully!');
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message || err.message || 'Failed to create lesson'
      );
    },
  });

  /** Returns the prev/next lesson relative to `currentLessonId` across all modules. */
  const getAdjacentLessons = (currentLessonId: string) => {
    if (!query.data) return { prev: null, next: null };

    const allLessons = query.data.flatMap((module) => module.lessons);
    const currentIndex = allLessons.findIndex((l) => l.id === currentLessonId);

    if (currentIndex === -1) return { prev: null, next: null };

    return {
      prev: currentIndex > 0 ? allLessons[currentIndex - 1] : null,
      next:
        currentIndex < allLessons.length - 1
          ? allLessons[currentIndex + 1]
          : null,
    };
  };

  return {
    modules: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,

    isCreatingModule: createModuleMutation.isPending,
    handleCreateModule: createModuleMutation.mutate,

    isCreatingLesson: createLessonMutation.isPending,
    handleCreateLesson: createLessonMutation.mutate,

    getAdjacentLessons,
  };
}
