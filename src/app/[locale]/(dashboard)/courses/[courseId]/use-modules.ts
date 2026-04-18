import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/api-client';
import { toast } from 'sonner';

export interface Lesson {
  id: string;
  title: string;
  orderIndex: number;
  content: any; 
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  orderIndex: number;
  lessons: Lesson[];
}

export function useModules(courseId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['modules', courseId],
    queryFn: () =>
      apiClient.get<Module[]>(`/v1/courses/${courseId}/modules`),
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

  const updateLessonMutation = useMutation({
    mutationFn: (data: { lessonId: string; title?: string; content?: any }) =>
      apiClient.patch<Lesson>(`/v1/lessons/${data.lessonId}`, {
        title: data.title,
        content: data.content,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules', courseId] });
      toast.success('Lesson saved successfully!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update lesson');
    },
  });

  // Helper function to get previous/next lesson
  const getAdjacentLessons = (currentLessonId: string) => {
    if (!query.data) return { prev: null, next: null };
    const allLessons = query.data.flatMap(module => module.lessons);
    const currentIndex = allLessons.findIndex(l => l.id === currentLessonId);
    if (currentIndex === -1) return { prev: null, next: null };
    return {
      prev: currentIndex > 0 ? allLessons[currentIndex - 1] : null,
      next: currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null,
    };
  };

  return {
    modules: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    
    isCreatingModule: createModuleMutation.isPending,
    handleCreateModule: createModuleMutation.mutate,
    
    isUpdatingLesson: updateLessonMutation.isPending,
    handleUpdateLesson: updateLessonMutation.mutate,
    getAdjacentLessons,
  };
}
