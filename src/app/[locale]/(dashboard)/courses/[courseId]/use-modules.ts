'use client';

import { experimental_useObject as useObject } from '@ai-sdk/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { apiClient } from '@/lib/api/api-client';
import { aiCourseGenerationSchema } from '@/lib/validations/course.schema';
export interface Lesson {
  id: string;
  title: string;
  orderIndex: number;
  content: Record<string, unknown> | null;
  canEdit?: boolean;
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  orderIndex: number;
  itemLayout: { id: string; orderIndex: number; indent: number }[] | null;
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
  const t = useTranslations('Courses.CourseModules');

  const [isSaving, setIsSaving] = useState(false);
  const fileRef = useRef<File | null>(null);

  const {
    object: streamingCourse,
    submit,
    isLoading: isStreaming,
  } = useObject({
    api: '/api/v1/ai/courses',
    schema: aiCourseGenerationSchema,
    onFinish: async () => {
      setIsSaving(true);
      await queryClient.invalidateQueries({ queryKey: ['modules', courseId] });
      setIsSaving(false);
      toast.success(t('AiGeneration.success'));
    },
    onError: (error) => {
      toast.error(t('AiGeneration.failed'));
      console.error(error);
    },
    fetch: async (url, init) => {
      if (fileRef.current && init?.body) {
        const parsedBody = JSON.parse(init.body as string);
        const formData = new FormData();
        formData.append('courseId', parsedBody.courseId);
        if (parsedBody.apiKey) formData.append('apiKey', parsedBody.apiKey);
        if (parsedBody.context) formData.append('context', parsedBody.context);
        formData.append('file', fileRef.current);

        const headers = new Headers(init.headers);
        // Remove Content-Type so browser sets it to multipart/form-data with correct boundary
        headers.delete('Content-Type');

        const newInit = { ...init, headers, body: formData };
        // Clear the ref so we don't accidentally send it again on retries/future requests
        fileRef.current = null;

        return fetch(url, newInit);
      }
      return fetch(url, init);
    },
  });

  const generateCourseModules = async (selection: {
    fileId?: string;
    file?: File;
    context?: string;
  }) => {
    try {
      if (selection.file) {
        fileRef.current = selection.file;
        submit({ courseId, context: selection.context });
        toast.success(t('AiGeneration.documentReceived'));
      } else if (selection.fileId) {
        submit({
          fileId: selection.fileId,
          courseId,
          context: selection.context,
        });
        toast.success(t('AiGeneration.startingGeneration'));
      }
    } catch (error) {
      console.error('AI selection error:', error);
      toast.error(t('AiGeneration.error'));
    }
  };

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
    error: query.error,

    isCreatingModule: createModuleMutation.isPending,
    handleCreateModule: createModuleMutation.mutate,

    isCreatingLesson: createLessonMutation.isPending,
    handleCreateLesson: createLessonMutation.mutate,

    streamingCourse,
    isStreaming,
    isSaving,
    generateCourseModules,

    getAdjacentLessons,
  };
}
