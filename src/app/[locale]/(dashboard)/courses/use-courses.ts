import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notFound } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/api-client';

export type CourseListSort =
  | 'updated-desc'
  | 'created-desc'
  | 'title-asc'
  | 'members-desc';

export interface CourseListParams {
  ownedOnly?: boolean;
  page?: number;
  pageSize?: number;
  publicOnly?: boolean;
  search?: string;
  sort?: CourseListSort;
}

export interface Course {
  id: string;
  ownerId?: string;
  title: string;
  description: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt?: string;
  isOwner?: boolean;
  _count?: {
    modules: number;
    enrollments: number;
  };
}

export interface CourseListResponse {
  items: Course[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const DEFAULT_COURSE_LIST_PARAMS = {
  ownedOnly: false,
  page: 1,
  pageSize: 100,
  publicOnly: false,
  search: '',
  sort: 'updated-desc' as CourseListSort,
};

function buildCoursesPath(params: CourseListParams = {}) {
  const finalParams = { ...DEFAULT_COURSE_LIST_PARAMS, ...params };
  const searchParams = new URLSearchParams({
    ownedOnly: String(finalParams.ownedOnly),
    page: String(finalParams.page),
    pageSize: String(finalParams.pageSize),
    publicOnly: String(finalParams.publicOnly),
    search: finalParams.search,
    sort: finalParams.sort,
  });

  return `v1/courses?${searchParams.toString()}`;
}

export function useCourses(
  courseId?: string,
  options: { enabled?: boolean; listParams?: CourseListParams } = {
    enabled: true,
  }
) {
  const t = useTranslations('Courses');
  const queryClient = useQueryClient();
  const listParams = {
    ...DEFAULT_COURSE_LIST_PARAMS,
    ...options.listParams,
  };
  const query = useQuery({
    queryKey: ['courses', listParams],
    queryFn: () =>
      apiClient.get<CourseListResponse>(buildCoursesPath(listParams)),
    enabled: options.enabled,
  });

  const courseQuery = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => apiClient.get<Course>(`v1/courses/${courseId}`),
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
      apiClient.post<Course>('v1/courses', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success(t('toast.created'));
    },
    onError: (err: any) => {
      toast.error(err.message || t('toast.createFailed'));
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: (data: { courseId: string; isPublished: boolean }) =>
      apiClient.patch<Course>(`v1/courses/${data.courseId}`, {
        isPublished: data.isPublished,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success(
        variables.isPublished ? t('toast.published') : t('toast.unpublished')
      );
    },
    onError: () => {
      toast.error(t('toast.updateFailed'));
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
    courses: query.data?.items || [],
    courseList: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    isFetching: query.isFetching,

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
