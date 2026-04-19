import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/api-client';
import { toast } from 'sonner';

export interface Course {
  id: string;
  title: string;
  description: string | null;
  isPublished: boolean;
  createdAt: string;
  _count: {
    modules: number;
    enrollments: number;
  };
}

export function useCourses() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['courses'],
    queryFn: () => apiClient.get<Course[]>('/v1/courses'),
  });

  const createCourseMutation = useMutation({
    mutationFn: (data: { title: string; description?: string }) =>
      apiClient.post<Course>('/v1/courses', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success('Course created successfully!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create course');
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: (data: { courseId: string; isPublished: boolean }) =>
      apiClient.patch<Course>(`/v1/courses/${data.courseId}`, {
        isPublished: data.isPublished,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success(
        `Course ${variables.isPublished ? 'published' : 'unpublished'}`
      );
    },
    onError: () => {
      toast.error('Failed to update course status');
    },
  });

  return {
    courses: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,

    isCreating: createCourseMutation.isPending,
    handleCreateCourse: createCourseMutation.mutate,

    handleTogglePublish: togglePublishMutation.mutate,
  };
}
