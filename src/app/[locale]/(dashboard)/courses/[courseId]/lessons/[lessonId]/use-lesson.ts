import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/api-client';
import type { TemplateInspection } from '@/services/SlideService';
import type { TiptapDocument } from '@/utils/lesson-content';
import { lessonService } from './lesson.service';
import { slideService, type TemplateImportSource } from './slide.service';

/**
 * Fetches the full lesson record (including content) for a given lessonId.
 * Separated from `useModules` because modules only carry lightweight lesson
 * summaries (no content) for sidebar/navigation use.
 */
export function useLesson(lessonId: string) {
  const query = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: () => lessonService.getLesson(lessonId),
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
  const t = useTranslations('Courses.LessonEditor');

  const mutation = useMutation({
    mutationFn: (data: {
      lessonId: string;
      title?: string;
      content?: TiptapDocument;
    }) => lessonService.updateLesson(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['modules', courseId] });
      queryClient.invalidateQueries({
        queryKey: ['lesson', variables.lessonId],
      });
      toast.success(t('saveSuccess'));
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || t('saveError'));
    },
  });

  return {
    isUpdatingLesson: mutation.isPending,
    handleUpdateLesson: mutation.mutate,
  };
}

/**
 * Mutation hook for planning presentation slides.
 */
export function usePlanPresentation() {
  const mutation = useMutation({
    mutationFn: (data: {
      lessonId: string;
      duration: string;
      context?: string;
    }) => lessonService.planPresentation(data),
  });

  return {
    planPresentation: mutation.mutateAsync,
    isPlanning: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Mutation hook for rendering an HTML slide deck from a planned outline via the
 * external slide service.
 */
export function useGenerateSlideDeck() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: {
      lessonId: string;
      title: string;
      palette?: string;
      collection?: string;
      slides: Array<{
        layoutType: string;
        slideTitle: string;
        bindings: Record<string, any>;
      }>;
    }) => lessonService.generateSlideDeck(data),
    onSuccess: (_, variables) => {
      // Refresh the lesson so the saved deck reference is available next time.
      queryClient.invalidateQueries({
        queryKey: ['lesson', variables.lessonId],
      });
    },
  });

  return {
    generateSlideDeck: mutation.mutateAsync,
    isGenerating: mutation.isPending,
    error: mutation.error,
  };
}

// TODO: Should bring to lesson.service.ts for some api usage
export function useDeleteLesson(courseId: string) {
  const queryClient = useQueryClient();
  const t = useTranslations('Courses.LessonHeader');

  const mutation = useMutation({
    mutationFn: (lessonId: string) =>
      apiClient.delete<void>(`/v1/lessons/${lessonId}`),

    onSuccess: (_, lessonId) => {
      queryClient.removeQueries({ queryKey: ['lesson', lessonId] });
      queryClient.invalidateQueries({ queryKey: ['modules', courseId] });
      toast.success(t('deleteSuccess'));
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || t('deleteError'));
    },
  });

  return {
    isDeletingLesson: mutation.isPending,
    handleDeleteLesson: mutation.mutate,
  };
}

export function useSlideHtml(deckId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['slide-html', deckId],
    queryFn: () =>
      apiClient.get<string>(`/v1/ai/slides/${deckId}`, {
        responseType: 'text',
      }),
    enabled: enabled && !!deckId,
  });
}

export function useUpdateSlideHtml() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { deckId: string; html: string }) =>
      apiClient.put<{ status: string }>(`/v1/ai/slides/${data.deckId}`, {
        html: data.html,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['slide-html', variables.deckId],
      });
    },
  });
}

export function useSlideTemplates() {
  return useQuery({
    queryKey: ['slide-templates'],
    queryFn: () => slideService.getTemplates(),
  });
}

export function useSlideTemplatePreviews(
  collectionName: string | null,
  enabled: boolean
) {
  return useQuery({
    queryKey: ['slide-template-previews', collectionName],
    queryFn: () => slideService.getTemplatePreviews(collectionName!),
    enabled: enabled && !!collectionName,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });
}

export function useSlideTemplateCategories(
  collectionName: string | null,
  enabled: boolean
) {
  return useQuery({
    queryKey: ['slide-template-categories', collectionName],
    queryFn: () => slideService.getTemplateCategories(collectionName!),
    enabled: enabled && !!collectionName,
  });
}

export function useImportSlideTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      file: File;
      name?: string;
      source?: TemplateImportSource;
    }) => slideService.importTemplate(data.file, data.name, data.source),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slide-templates'] });
    },
  });
}

export function useDownloadPptx() {
  return useMutation({
    mutationFn: (deckId: string) => slideService.downloadPptxBlob(deckId),
  });
}

export function useTemplateInspection(
  collection: string | null,
  enabled: boolean
) {
  return useQuery({
    queryKey: ['template-inspection', collection],
    queryFn: () =>
      apiClient.get<TemplateInspection>(
        `/v1/ai/templates/${encodeURIComponent(collection!)}/inspect`
      ),
    enabled: enabled && !!collection,
  });
}

export function useTemplateOverlay(
  collection: string | null,
  category: string | null,
  variant: string | undefined,
  enabled: boolean
) {
  return useQuery({
    queryKey: ['template-overlay', collection, category, variant],
    queryFn: () =>
      apiClient.get<{ svg: string }>(
        `/v1/ai/templates/${encodeURIComponent(collection!)}/inspect/${encodeURIComponent(category!)}/overlay?variant=${encodeURIComponent(variant || 'standard')}&boxes=false&editable=true`
      ),
    enabled: enabled && !!collection && !!category,
  });
}

export function useDeleteTemplateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { collection: string; category: string }) =>
      apiClient.delete<{
        collection: string;
        category: string;
        deleted: boolean;
      }>(
        `/v1/ai/templates/${encodeURIComponent(data.collection)}/inspect/${encodeURIComponent(data.category)}`
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['template-inspection', variables.collection],
      });
      queryClient.invalidateQueries({
        queryKey: ['slide-template-categories', variables.collection],
      });
    },
  });
}

export function useUpdateTemplateSlots() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      collection: string;
      category: string;
      variant: string;
      edits: Array<Record<string, unknown>>;
    }) =>
      apiClient.patch<{ applied: string[]; synced: boolean }>(
        `/v1/ai/templates/${encodeURIComponent(data.collection)}/inspect`,
        {
          category: data.category,
          variant: data.variant,
          edits: data.edits,
        }
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['template-inspection', variables.collection],
      });
      queryClient.invalidateQueries({
        queryKey: [
          'template-overlay',
          variables.collection,
          variables.category,
        ],
      });
    },
  });
}
