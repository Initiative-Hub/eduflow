'use client';

import { type RefObject, useCallback, useEffect, useState } from 'react';

interface Coords {
  x: number;
  y: number;
}

type Placement = 'above' | 'below';

interface UseTextSelectionOptions {
  /** Ref to the popup element — clicks inside it won't dismiss the selection */
  popupRef?: RefObject<HTMLElement | null>;
}

interface UseTextSelectionReturn {
  selectedWord: string;
  coords: Coords | null;
  placement: Placement;
  clearSelection: () => void;
}

/** Minimum space (px) needed above the word to show the popup there */
const POPUP_HEIGHT_ESTIMATE = 300;
/** Minimum space (px) needed below the word to show the popup there */
const POPUP_BOTTOM_MARGIN = 100;
/** Minimum top offset (px) to avoid being covered by the navbar */
const NAVBAR_HEIGHT = 64;

export function useTextSelection(
  options: UseTextSelectionOptions = {}
): UseTextSelectionReturn {
  const { popupRef } = options;
  const [selectedWord, setSelectedWord] = useState('');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [placement, setPlacement] = useState<Placement>('above');

  const clearSelection = useCallback(() => {
    setSelectedWord('');
    setCoords(null);
    // Remove the browser's text highlight when explicitly closing
    window.getSelection()?.removeAllRanges();
  }, []);

  useEffect(() => {
    function handleSelectionChange() {
      requestAnimationFrame(() => {
        const selection = window.getSelection();

        if (!selection || selection.isCollapsed || !selection.rangeCount) {
          // Only clear our state, don't remove browser ranges (caret)
          setSelectedWord('');
          setCoords(null);
          return;
        }

        const text = selection.toString().trim();

        if (!text || text.includes(' ')) {
          setSelectedWord('');
          setCoords(null);
          return;
        }

        const cleaned = text.replace(/[^a-zA-Z'-]/g, '');

        if (!cleaned || cleaned.length < 2) {
          setSelectedWord('');
          setCoords(null);
          return;
        }

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Decide placement based on available space
        const spaceAbove = rect.top - NAVBAR_HEIGHT;
        const spaceBelow = window.innerHeight - rect.bottom;

        // Prefer above, but if not enough space above (accounting for navbar), show below
        let showBelow: boolean;
        if (spaceAbove >= POPUP_HEIGHT_ESTIMATE) {
          showBelow = false;
        } else if (spaceBelow >= POPUP_BOTTOM_MARGIN) {
          showBelow = true;
        } else {
          // Neither has great space — pick whichever has more
          showBelow = spaceBelow > spaceAbove;
        }

        // Clamp horizontal position to keep popup within viewport
        // Account for potential sidebar (popup is 320px wide, centered)
        const popupHalfWidth = 160;
        const leftPadding = 16; // Extra padding from viewport edges
        const x = Math.max(
          popupHalfWidth + leftPadding,
          Math.min(
            rect.left + rect.width / 2,
            window.innerWidth - popupHalfWidth - leftPadding
          )
        );
        // Clamp vertical position to stay below the navbar
        const rawY = showBelow ? rect.bottom + 8 : rect.top - 8;
        const y = showBelow ? rawY : Math.max(rawY, NAVBAR_HEIGHT + 8);

        setSelectedWord(cleaned.toLowerCase());
        setCoords({ x, y });
        setPlacement(showBelow ? 'below' : 'above');
      });
    }

    function handleMouseDown(e: MouseEvent) {
      if (popupRef?.current?.contains(e.target as Node)) {
        return;
      }

      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        const isInsideSelection =
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom;

        if (!isInsideSelection) {
          setSelectedWord('');
          setCoords(null);
          // Only remove browser selection when dismissing the popup
          selection.removeAllRanges();
        }
      }
    }

    document.addEventListener(
      'mouseup',
      handleSelectionChange as EventListener
    );
    document.addEventListener(
      'touchend',
      handleSelectionChange as EventListener
    );
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener(
        'mouseup',
        handleSelectionChange as EventListener
      );
      document.removeEventListener(
        'touchend',
        handleSelectionChange as EventListener
      );
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [clearSelection, popupRef]);

  return { selectedWord, coords, placement, clearSelection };
}
