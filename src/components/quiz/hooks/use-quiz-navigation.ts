'use client';

import { useCallback, useState } from 'react';

interface UseQuizNavigationReturn {
  currentIndex: number;
  next: () => void;
  previous: () => void;
  isFirst: boolean;
  isLast: boolean;
  reset: () => void;
}

export function useQuizNavigation(
  totalQuestions: number
): UseQuizNavigationReturn {
  const [currentIndex, setCurrentIndex] = useState(0);

  const next = useCallback(() => {
    setCurrentIndex((prev) => Math.min(prev + 1, totalQuestions - 1));
  }, [totalQuestions]);

  const previous = useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const reset = useCallback(() => {
    setCurrentIndex(0);
  }, []);

  return {
    currentIndex,
    next,
    previous,
    isFirst: currentIndex === 0,
    isLast: currentIndex === totalQuestions - 1,
    reset,
  };
}
