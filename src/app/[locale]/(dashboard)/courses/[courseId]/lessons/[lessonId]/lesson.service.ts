import { apiClient } from '@/lib/api/api-client';
import type { TiptapDocument } from '@/utils/lesson-content';
import type { Lesson } from '../../use-modules';

export const lessonService = {
  getLesson: (lessonId: string) => {
    return apiClient.get<Lesson>(`/v1/lessons/${lessonId}`);
  },

  updateLesson: (data: {
    lessonId: string;
    title?: string;
    content?: TiptapDocument;
  }) => {
    return apiClient.patch<Lesson>(`/v1/lessons/${data.lessonId}`, {
      title: data.title,
      content: data.content,
    });
  },

  planPresentation: (data: {
    lessonId: string;
    duration: string;
    context?: string;
  }) => {
    return apiClient.post<{ slides: any[] }>('/v1/presentation/plan', data);
  },
};
