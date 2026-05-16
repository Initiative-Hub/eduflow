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
const POPUP_HEIGHT_ESTIMATE = 200;

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
  }, []);

  useEffect(() => {
    function handleSelectionChange() {
      requestAnimationFrame(() => {
        const selection = window.getSelection();

        if (!selection || selection.isCollapsed || !selection.rangeCount) {
          clearSelection();
          return;
        }

        const text = selection.toString().trim();

        if (!text || text.includes(' ')) {
          clearSelection();
          return;
        }

        const cleaned = text.replace(/[^a-zA-Z'-]/g, '');

        if (!cleaned || cleaned.length < 2) {
          clearSelection();
          return;
        }

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Decide placement: if not enough space above, show below
        const spaceAbove = rect.top;
        const showBelow = spaceAbove < POPUP_HEIGHT_ESTIMATE;

        const x = rect.left + rect.width / 2;
        const y = showBelow ? rect.bottom + 8 : rect.top - 8;

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
          clearSelection();
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
