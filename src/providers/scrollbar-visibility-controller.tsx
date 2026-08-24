'use client';

import { useEffect } from 'react';

const SCROLLBAR_IDLE_TIMEOUT_MS = 900;
const SCROLLING_CLASS_NAME = 'is-scrolling';

export function ScrollbarVisibilityController() {
  useEffect(() => {
    let idleTimer: number | undefined;

    const clearScrollingState = () => {
      document.documentElement.classList.remove(SCROLLING_CLASS_NAME);
    };

    const markScrolling = () => {
      document.documentElement.classList.add(SCROLLING_CLASS_NAME);

      if (idleTimer) {
        window.clearTimeout(idleTimer);
      }

      idleTimer = window.setTimeout(
        clearScrollingState,
        SCROLLBAR_IDLE_TIMEOUT_MS
      );
    };

    document.addEventListener('scroll', markScrolling, {
      capture: true,
      passive: true,
    });

    return () => {
      if (idleTimer) {
        window.clearTimeout(idleTimer);
      }

      document.removeEventListener('scroll', markScrolling, {
        capture: true,
      });
      clearScrollingState();
    };
  }, []);

  return null;
}
