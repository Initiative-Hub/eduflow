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

  generateSlideDeck: (data: {
    lessonId: string;
    title: string;
    palette?: string;
    slides: Array<{
      layoutType: string;
      slideTitle: string;
      bindings: Record<string, any>;
    }>;
  }) => {
    // Slide rendering (image generation + HTML assembly) runs well beyond the
    // default client timeout, so extend it for this request only.
    return apiClient.post<{
      deckId: string;
      deckUrl: string;
      slides: any[];
      warnings: string[];
      usage?: {
        input_tokens?: number;
        output_tokens?: number;
        total_tokens?: number;
        requests?: number;
        estimated_cost_usd?: number;
        report?: string;
      };
    }>('/v1/ai/slides', data, { timeout: 300_000 });
  },
};
