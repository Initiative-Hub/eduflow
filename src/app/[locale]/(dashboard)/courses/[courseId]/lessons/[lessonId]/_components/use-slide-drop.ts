'use client';

import { useTranslations } from 'next-intl';
import type { RefObject } from 'react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import {
  activateSlide,
  countDroppedSlides,
  getSlideElements,
  isSlideDropped,
  refreshDroppedSlides,
  SLIDE_DROP_ATTRIBUTE,
} from '@/utils/slide-deck-drop';

interface UseSlideDropOptions {
  iframeRef: RefObject<HTMLIFrameElement | null>;
}

/**
 * Tracks which generated slides are dropped (skipped while presenting) and
 * toggles the persisted marker on the currently active slide.
 */
export function useSlideDrop({ iframeRef }: UseSlideDropOptions) {
  const t = useTranslations('Courses.LessonPresentation');
  const [isActiveSlideDropped, setIsActiveSlideDropped] = useState(false);
  const [droppedCount, setDroppedCount] = useState(0);

  const syncDropState = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) {
      setIsActiveSlideDropped(false);
      setDroppedCount(0);
      return;
    }

    const activeSlide = doc.querySelector('.slide.active');
    setIsActiveSlideDropped(
      Boolean(activeSlide && isSlideDropped(activeSlide))
    );
    setDroppedCount(countDroppedSlides(doc));
  }, [iframeRef]);

  const toggleActiveSlideDropped = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    const activeSlide = doc?.querySelector<HTMLElement>('.slide.active');
    if (!doc || !activeSlide) {
      toast.error(t('dropSlideUnavailable'));
      return;
    }

    const shouldDrop = !isSlideDropped(activeSlide);
    if (shouldDrop) {
      const remaining = getSlideElements(doc).filter(
        (slide) => slide !== activeSlide && !isSlideDropped(slide)
      );
      if (remaining.length === 0) {
        toast.error(t('dropSlideLastRemaining'));
        return;
      }
      activeSlide.setAttribute(SLIDE_DROP_ATTRIBUTE, 'true');
    } else {
      activeSlide.removeAttribute(SLIDE_DROP_ATTRIBUTE);
    }

    // Keep the just-toggled slide on screen so the action can be undone, while
    // re-syncing the deck counter to the new presentable slide count.
    refreshDroppedSlides(doc);
    syncDropState();
    toast.success(
      shouldDrop ? t('dropSlideSuccess') : t('restoreSlideSuccess')
    );
  }, [iframeRef, syncDropState, t]);

  /**
   * Deck navigation skips dropped slides, so restoring one needs an explicit
   * way to bring it back on screen.
   */
  const focusNextDroppedSlide = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) {
      toast.error(t('dropSlideUnavailable'));
      return;
    }

    const dropped = getSlideElements(doc).filter(isSlideDropped);
    if (dropped.length === 0) return;

    const activeSlide = doc.querySelector('.slide.active');
    const currentPosition = activeSlide
      ? dropped.indexOf(activeSlide as HTMLElement)
      : -1;
    const next = dropped[(currentPosition + 1) % dropped.length];

    activateSlide(doc, next);
    syncDropState();
  }, [iframeRef, syncDropState, t]);

  return {
    isActiveSlideDropped,
    droppedCount,
    syncDropState,
    toggleActiveSlideDropped,
    focusNextDroppedSlide,
  };
}
