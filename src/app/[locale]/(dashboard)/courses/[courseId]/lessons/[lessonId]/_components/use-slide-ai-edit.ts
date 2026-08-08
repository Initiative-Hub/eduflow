'use client';

import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import type { RefObject } from 'react';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/api-client';
import type {
  SlideAiEditRequest,
  SlideAiEditResponse,
  SlideAiEditScope,
} from '@/lib/validation/slide-ai-edit';
import type {
  SlideAiImageRequest,
  SlideAiImageResponse,
  SlideImageAspectRatio,
} from '@/lib/validation/slide-ai-image';
import type { SlideCanvasImageElement } from './slide-canvas-ai-controls';

export type SlideAiDialogScope = SlideAiEditScope | 'image';

const IMAGE_ASPECT_RATIOS: ReadonlyArray<{
  value: SlideImageAspectRatio;
  ratio: number;
}> = [
  { value: '1:2', ratio: 1 / 2 },
  { value: '2:3', ratio: 2 / 3 },
  { value: '3:4', ratio: 3 / 4 },
  { value: '4:5', ratio: 4 / 5 },
  { value: '1:1', ratio: 1 },
  { value: '5:4', ratio: 5 / 4 },
  { value: '4:3', ratio: 4 / 3 },
  { value: '3:2', ratio: 3 / 2 },
  { value: '16:9', ratio: 16 / 9 },
  { value: '2:1', ratio: 2 },
  { value: '9:16', ratio: 9 / 16 },
];

export function getEditableSlideTextElements(
  root: Document | Element
): SVGTextContentElement[] {
  return Array.from(
    root.querySelectorAll<SVGTextContentElement>('text, tspan')
  ).filter((element) => {
    const hasText = Boolean(element.textContent?.trim());
    const hasChildTextRuns = Boolean(element.querySelector('tspan'));
    return hasText && !hasChildTextRuns;
  });
}

function getClosestImageAspectRatio(
  element: SlideCanvasImageElement
): SlideImageAspectRatio {
  const rect = element.getBoundingClientRect();
  const targetRatio =
    rect.width > 0 && rect.height > 0 ? rect.width / rect.height : 1;

  return IMAGE_ASPECT_RATIOS.reduce((closest, candidate) =>
    Math.abs(Math.log(candidate.ratio / targetRatio)) <
    Math.abs(Math.log(closest.ratio / targetRatio))
      ? candidate
      : closest
  ).value;
}

function replaceImageSource(
  element: SlideCanvasImageElement,
  imageUrl: string
) {
  if (element.tagName.toLowerCase() === 'img') {
    element.setAttribute('src', imageUrl);
    return;
  }

  const xlinkNamespace = 'http://www.w3.org/1999/xlink';
  const hasXlinkHref = element.hasAttributeNS(xlinkNamespace, 'href');
  element.setAttribute('href', imageUrl);
  if (hasXlinkHref) {
    element.setAttributeNS(xlinkNamespace, 'href', imageUrl);
  }
}

interface UseSlideAiEditOptions {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  deckId?: string;
}

export function useSlideAiEdit({ iframeRef, deckId }: UseSlideAiEditOptions) {
  const t = useTranslations('Courses.LessonPresentation');
  const selectedTextElementRef = useRef<SVGTextContentElement | null>(null);
  const selectedImageElementRef = useRef<SlideCanvasImageElement | null>(null);
  const pendingTargetsRef = useRef<Map<string, SVGTextContentElement>>(
    new Map()
  );
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [scope, setScope] = useState<SlideAiDialogScope | null>(null);

  const editMutation = useMutation({
    mutationFn: (request: SlideAiEditRequest) =>
      apiClient.post<SlideAiEditResponse>('v1/ai/slides/edit', request),
  });
  const imageMutation = useMutation({
    mutationFn: (request: SlideAiImageRequest) =>
      apiClient.post<SlideAiImageResponse>('v1/ai/slides/images', request, {
        timeout: 70_000,
      }),
  });

  const clearSelection = useCallback(() => {
    selectedTextElementRef.current?.removeAttribute('data-ai-selected');
    selectedImageElementRef.current?.removeAttribute('data-ai-selected');
    selectedTextElementRef.current = null;
    selectedImageElementRef.current = null;
    setSelectedText(null);
    setScope(null);
  }, []);

  const selectTextElement = useCallback(
    (element: SVGTextContentElement) => {
      if (selectedTextElementRef.current !== element) {
        clearSelection();
      }
      selectedTextElementRef.current = element;
      element.setAttribute('data-ai-selected', 'true');
      setSelectedText(element.textContent?.trim() || null);
    },
    [clearSelection]
  );

  const getActiveSlide = useCallback(() => {
    return iframeRef.current?.contentDocument?.querySelector<HTMLElement>(
      '.slide.active'
    );
  }, [iframeRef]);

  const openSelectedTextEdit = useCallback(() => {
    const target = selectedTextElementRef.current;
    const activeSlide = getActiveSlide();
    if (!target?.isConnected || !activeSlide?.contains(target)) {
      clearSelection();
      toast.error(t('aiTextUnavailable'));
      return;
    }
    setScope('element');
  }, [clearSelection, getActiveSlide, t]);

  const openImageEdit = useCallback(
    (element: SlideCanvasImageElement) => {
      const activeSlide = getActiveSlide();
      if (!element.isConnected || !activeSlide?.contains(element)) {
        clearSelection();
        toast.error(t('aiImageUnavailable'));
        return;
      }

      clearSelection();
      selectedImageElementRef.current = element;
      element.setAttribute('data-ai-selected', 'true');
      setScope('image');
    },
    [clearSelection, getActiveSlide, t]
  );

  const openCurrentSlideEdit = useCallback(() => {
    const activeSlide = getActiveSlide();
    if (
      !activeSlide ||
      getEditableSlideTextElements(activeSlide).length === 0
    ) {
      toast.error(t('aiSlideUnavailable'));
      return;
    }
    setScope('slide');
  }, [getActiveSlide, t]);

  const isPending = editMutation.isPending || imageMutation.isPending;

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open && !isPending) {
        setScope(null);
        if (selectedImageElementRef.current) clearSelection();
      }
    },
    [clearSelection, isPending]
  );

  const submitImageGeneration = useCallback(
    (prompt: string) => {
      const activeSlide = getActiveSlide();
      const target = selectedImageElementRef.current;
      if (!deckId || !target?.isConnected || !activeSlide?.contains(target)) {
        toast.error(t('aiImageUnavailable'));
        setScope(null);
        clearSelection();
        return;
      }

      imageMutation.mutate(
        {
          deckId,
          prompt,
          aspectRatio: getClosestImageAspectRatio(target),
        },
        {
          onSuccess: ({ imageUrl }) => {
            if (target.isConnected) replaceImageSource(target, imageUrl);
            setScope(null);
            clearSelection();
            toast.success(t('aiImageSuccess'));
          },
          onError: (error: { message?: string }) => {
            toast.error(error.message || t('aiImageError'));
          },
        }
      );
    },
    [clearSelection, deckId, getActiveSlide, imageMutation, t]
  );

  const submitEdit = useCallback(
    (instruction: string) => {
      if (scope === 'image') {
        submitImageGeneration(instruction);
        return;
      }

      const doc = iframeRef.current?.contentDocument;
      const activeTextarea = doc?.querySelector<HTMLTextAreaElement>(
        'textarea[data-active-editor="true"]'
      );
      activeTextarea?.blur();

      const activeSlide = getActiveSlide();
      const selectedTarget = selectedTextElementRef.current;
      const targets =
        scope === 'element' &&
        selectedTarget?.isConnected &&
        activeSlide?.contains(selectedTarget)
          ? [selectedTarget]
          : scope === 'slide' && activeSlide
            ? getEditableSlideTextElements(activeSlide)
            : [];

      if (targets.length === 0 || !scope) {
        toast.error(
          scope === 'element' ? t('aiTextUnavailable') : t('aiSlideUnavailable')
        );
        setScope(null);
        return;
      }

      const items = targets.map((target, index) => {
        const text = target.textContent?.replace(/\s+/g, ' ').trim() || '';
        return {
          id: `text-${index}`,
          text,
          maxCharacters: Math.max(1, text.length),
        };
      });
      pendingTargetsRef.current = new Map(
        items.map((item, index) => [item.id, targets[index]])
      );

      editMutation.mutate(
        { scope, instruction, items },
        {
          onSuccess: (response) => {
            for (const item of response.items) {
              const target = pendingTargetsRef.current.get(item.id);
              if (target?.isConnected) target.textContent = item.text;
            }

            const selectedTargetAfterEdit = selectedTextElementRef.current;
            if (selectedTargetAfterEdit?.isConnected) {
              setSelectedText(
                selectedTargetAfterEdit.textContent?.trim() || null
              );
            }
            setScope(null);
            toast.success(t('aiEditSuccess'));
          },
          onError: (error: { message?: string }) => {
            toast.error(error.message || t('aiEditError'));
          },
        }
      );
    },
    [editMutation, getActiveSlide, iframeRef, scope, submitImageGeneration, t]
  );

  return {
    selectedText,
    scope,
    isDialogOpen: scope !== null,
    isPending,
    selectTextElement,
    clearSelection,
    openSelectedTextEdit,
    openImageEdit,
    openCurrentSlideEdit,
    handleOpenChange,
    submitEdit,
  };
}
