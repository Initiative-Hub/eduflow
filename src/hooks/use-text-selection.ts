'use client';

import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

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
  const rangeRef = useRef<Range | null>(null);

  const clearSelection = useCallback(() => {
    setSelectedWord('');
    setCoords(null);
    rangeRef.current = null;
    // Remove the browser's text highlight when explicitly closing
    window.getSelection()?.removeAllRanges();
  }, []);

  const updatePosition = useCallback(() => {
    if (!rangeRef.current) return;

    const rect = rangeRef.current.getBoundingClientRect();
    const popupEl = popupRef?.current;
    const h = popupEl ? popupEl.offsetHeight : 0;
    const actualHeight = h || POPUP_HEIGHT_ESTIMATE;

    // Get the main layout inset boundaries to avoid overlapping the sidebar
    const inset = document.querySelector('[data-slot="sidebar-inset"]');
    const insetRect = inset
      ? inset.getBoundingClientRect()
      : { left: 0, right: window.innerWidth };

    // Decide placement based on available space
    const spaceAbove = rect.top - NAVBAR_HEIGHT;
    const spaceBelow = window.innerHeight - rect.bottom;

    // Prefer above, but if not enough space above, show below
    let showBelow: boolean;
    if (spaceAbove >= actualHeight + 8) {
      showBelow = false;
    } else if (spaceBelow >= actualHeight + 8) {
      showBelow = true;
    } else {
      // Neither has enough space — pick whichever has more
      showBelow = spaceBelow > spaceAbove;
    }

    // Clamp horizontal position to keep popup within the SidebarInset / viewport
    const popupHalfWidth = 160;
    const leftPadding = 16;

    const leftBound = insetRect.left ?? 0;
    const rightBound = insetRect.right ?? window.innerWidth;

    const leftLimit = leftBound + leftPadding + popupHalfWidth;
    const rightLimit = Math.max(
      leftLimit,
      rightBound - leftPadding - popupHalfWidth
    );
    const x = Math.max(
      leftLimit,
      Math.min(rect.left + rect.width / 2, rightLimit)
    );

    // Clamp vertical position to stay below the navbar and above screen bottom
    let y: number;
    if (showBelow) {
      const rawY = rect.bottom + 8;
      y = Math.max(
        NAVBAR_HEIGHT + 8,
        Math.min(rawY, window.innerHeight - 8 - actualHeight)
      );
    } else {
      const rawY = rect.top - 8;
      y = Math.max(
        NAVBAR_HEIGHT + 8 + actualHeight,
        Math.min(rawY, window.innerHeight - 8)
      );
    }

    setCoords({ x, y });
    setPlacement(showBelow ? 'below' : 'above');
  }, [popupRef]);

  // Set up ResizeObserver to recalculate position when the popup size changes
  useEffect(() => {
    if (!popupRef?.current) return;

    const observer = new ResizeObserver(() => {
      if (rangeRef.current) {
        updatePosition();
      }
    });

    observer.observe(popupRef.current);
    return () => observer.disconnect();
  }, [popupRef, updatePosition]);

  useEffect(() => {
    function handleSelectionChange() {
      requestAnimationFrame(() => {
        const selection = window.getSelection();

        if (!selection || selection.isCollapsed || !selection.rangeCount) {
          // Only clear our state, don't remove browser ranges (caret)
          setSelectedWord('');
          setCoords(null);
          rangeRef.current = null;
          return;
        }

        const text = selection.toString().trim();

        if (!text || text.includes(' ')) {
          setSelectedWord('');
          setCoords(null);
          rangeRef.current = null;
          return;
        }

        const cleaned = text.replace(/[^a-zA-Z'-]/g, '');

        if (!cleaned || cleaned.length < 2) {
          setSelectedWord('');
          setCoords(null);
          rangeRef.current = null;
          return;
        }

        const range = selection.getRangeAt(0);
        rangeRef.current = range.cloneRange();

        setSelectedWord(cleaned.toLowerCase());
        updatePosition();
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
          rangeRef.current = null;
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
  }, [clearSelection, popupRef, updatePosition]);

  return { selectedWord, coords, placement, clearSelection };
}
