'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { MatchingPair } from '@/lib/quiz-template';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ConnectingLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  leftId: string;
  rightId: string;
  isCorrect: boolean;
}

interface UseConnectingLinesOptions {
  /** Current user-made pairs */
  pairs: MatchingPair[];
  /** Correct pairs for comparison (required to draw correction lines) */
  correctPairs?: MatchingPair[];
  /** Map of element keys to their DOM elements */
  itemRefs: React.RefObject<Map<string, HTMLElement>>;
  /** Whether line calculation is enabled (e.g., only in result mode) */
  enabled?: boolean;
}

/**
 * Hook that calculates SVG connecting lines between matched pairs.
 * Uses ResizeObserver to recalculate when elements resize, and
 * useLayoutEffect for initial calculation.
 *
 * Lines connect from the right edge of left items to the left edge of right items,
 * with y coordinates at the vertical center of each item.
 */
export function useConnectingLines(
  containerRef: React.RefObject<HTMLDivElement | null>,
  options: UseConnectingLinesOptions
): ConnectingLine[] {
  const { pairs, correctPairs, itemRefs, enabled = true } = options;
  const [lines, setLines] = useState<ConnectingLine[]>([]);
  const observerRef = useRef<ResizeObserver | null>(null);

  const calculateLines = useCallback(() => {
    if (!enabled || !containerRef.current || !correctPairs) {
      setLines([]);
      return;
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    const refs = itemRefs.current;
    if (!refs) return;

    const newLines: ConnectingLine[] = [];

    // For each pair the student made, check if it's correct
    // If incorrect, draw a line to the correct right match instead
    for (const pair of pairs) {
      const isCorrect = correctPairs.some(
        (cp) => cp.leftId === pair.leftId && cp.rightId === pair.rightId
      );

      if (!isCorrect) {
        // Draw line from left item to its CORRECT right match
        const correctPair = correctPairs.find(
          (cp) => cp.leftId === pair.leftId
        );
        if (correctPair) {
          const leftEl = refs.get(`left-${pair.leftId}`);
          const rightEl = refs.get(`right-${correctPair.rightId}`);
          if (leftEl && rightEl) {
            const leftRect = leftEl.getBoundingClientRect();
            const rightRect = rightEl.getBoundingClientRect();
            newLines.push({
              x1: leftRect.right - containerRect.left,
              y1: leftRect.top + leftRect.height / 2 - containerRect.top,
              x2: rightRect.left - containerRect.left,
              y2: rightRect.top + rightRect.height / 2 - containerRect.top,
              leftId: pair.leftId,
              rightId: correctPair.rightId,
              isCorrect: false,
            });
          }
        }
      }
    }

    // For unmatched left items, draw line to their correct right match
    const matchedLeftIds = new Set(pairs.map((p) => p.leftId));
    for (const cp of correctPairs) {
      if (!matchedLeftIds.has(cp.leftId)) {
        const leftEl = refs.get(`left-${cp.leftId}`);
        const rightEl = refs.get(`right-${cp.rightId}`);
        if (leftEl && rightEl) {
          const leftRect = leftEl.getBoundingClientRect();
          const rightRect = rightEl.getBoundingClientRect();
          newLines.push({
            x1: leftRect.right - containerRect.left,
            y1: leftRect.top + leftRect.height / 2 - containerRect.top,
            x2: rightRect.left - containerRect.left,
            y2: rightRect.top + rightRect.height / 2 - containerRect.top,
            leftId: cp.leftId,
            rightId: cp.rightId,
            isCorrect: false,
          });
        }
      }
    }

    setLines(newLines);
  }, [enabled, containerRef, pairs, correctPairs, itemRefs]);

  // Initial calculation using useLayoutEffect (synchronous after DOM mutations)
  useLayoutEffect(() => {
    calculateLines();
  }, [calculateLines]);

  // ResizeObserver for recalculation when elements resize
  useLayoutEffect(() => {
    if (!enabled || !containerRef.current) return;

    observerRef.current = new ResizeObserver(() => {
      calculateLines();
    });

    observerRef.current.observe(containerRef.current);

    // Also handle window resize for layout shifts
    window.addEventListener('resize', calculateLines);

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      window.removeEventListener('resize', calculateLines);
    };
  }, [enabled, containerRef, calculateLines]);

  return lines;
}
