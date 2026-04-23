import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notFound } from 'next/navigation';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/api-client';

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

export function useCourses(courseId?: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['courses'],
    queryFn: () => apiClient.get<Course[]>('/v1/courses'),
  });

  const courseQuery = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => apiClient.get<Course>(`/v1/courses/${courseId}`),
    enabled: !!courseId,
    retry: false,
  });

  if (courseQuery.isError) {
    const status =
      (courseQuery.error as any)?.status ||
      (courseQuery.error as any)?.response?.status;
    if (status === 403 || status === 404) {
      notFound();
    }
  }

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

  const handleCreateCourse = useCallback(
    (
      data: { title: string; description?: string },
      options?: { onSuccess?: () => void }
    ) => createCourseMutation.mutate(data, options),
    [createCourseMutation]
  );

  const handleTogglePublish = useCallback(
    (id: string, isPublished: boolean) =>
      togglePublishMutation.mutate({ courseId: id, isPublished }),
    [togglePublishMutation]
  );

  return {
    // All courses
    courses: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,

    // Single course
    course: courseQuery.data,
    isCourseLoading: courseQuery.isLoading,
    courseError: courseQuery.error,

    // Mutations
    isCreating: createCourseMutation.isPending,
    handleCreateCourse,
    handleTogglePublish,
  };
}
