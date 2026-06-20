'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { apiClient } from '@/lib/api/api-client';
import type { TiptapDocument } from '@/utils/lesson-content';
import { useGenerateCourse } from './use-generate-course';

export interface Lesson {
  id: string;
  title: string;
  orderIndex: number;
  content: TiptapDocument;
  canEdit?: boolean;
  /** Most recently generated presentation deck reference (if any). */
  presentationDeckId?: string | null;
  presentationDeckKey?: string | null;
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
 */
export function useModules(courseId: string) {
  const queryClient = useQueryClient();
  const t = useTranslations('Courses.CourseModules');

  const {
    step,
    streamingCourse,
    searchSources,
    isRunning,
    error: generationError,
    generate,
    reset,
  } = useGenerateCourse(
    () => {
      queryClient.invalidateQueries({ queryKey: ['modules', courseId] });
      toast.success(t('AiGeneration.success'));
    },
    (msg) => {
      toast.error(t('AiGeneration.failed'));
      console.error(msg);
    }
  );

  const generateCourseModules = async (selection: {
    fileId?: string;
    file?: File;
    context?: string;
  }) => {
    await generate({
      courseId,
      fileId: selection.fileId,
      file: selection.file,
      context: selection.context,
      model: 'gemini-3.1-pro-preview',
    });
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
    onError: (err: unknown) => {
      const e = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      toast.error(
        e.response?.data?.message || e.message || 'Failed to create lesson'
      );
    },
  });

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

    // New stream state
    generationStep: step,
    generationError,
    streamingCourse,
    searchSources,
    isRunning,
    resetGeneration: reset,
    generateCourseModules,
    getAdjacentLessons,
  };
}
