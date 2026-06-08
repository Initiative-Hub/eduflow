'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2, Volume2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  type CSSProperties,
  type MouseEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { cn } from '@/lib/utils';

interface DictionaryMeaning {
  partOfSpeech: string;
  definition: string;
  example?: string;
}

interface DictionaryData {
  word: string;
  phonetic: string | null;
  audioUrl: string | null;
  meanings: DictionaryMeaning[];
}

interface PopoverPosition {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
}

interface WordDictionaryPopoverProps {
  open: boolean;
  word: string | null;
  anchorElement: HTMLElement | null;
  onOpenChange: (open: boolean) => void;
}

const NAVBAR_HEIGHT = 64;
const POPUP_WIDTH = 320;
const POPUP_HEIGHT_ESTIMATE = 360;
const VIEWPORT_MARGIN = 16;
const GAP = 8;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

async function fetchDictionaryEntry(word: string): Promise<DictionaryData> {
  const response = await fetch(
    `/api/v1/dictionary?word=${encodeURIComponent(word)}&provider=mw-collegiate`,
    { cache: 'no-store' }
  );

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? 'Unable to load definition');
  }

  return response.json();
}

export function WordDictionaryPopover({
  open,
  word,
  anchorElement,
  onOpenChange,
}: WordDictionaryPopoverProps) {
  const t = useTranslations('DictionaryDialog');
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<PopoverPosition | null>(null);

  const dictionaryQuery = useQuery({
    queryKey: ['dictionary', 'mw-collegiate', word],
    queryFn: () => fetchDictionaryEntry(word ?? ''),
    enabled: open && Boolean(word),
    staleTime: 1000 * 60 * 60,
  });

  const updatePosition = useCallback(() => {
    if (!open || !anchorElement) return;

    const rect = anchorElement.getBoundingClientRect();
    const inset = document.querySelector('[data-slot="sidebar-inset"]');
    const insetRect = inset?.getBoundingClientRect();
    const leftBound = insetRect?.left ?? 0;
    const rightBound = insetRect?.right ?? window.innerWidth;
    const width = Math.min(
      POPUP_WIDTH,
      Math.max(240, rightBound - leftBound - VIEWPORT_MARGIN * 2)
    );
    const popupHeight =
      popoverRef.current?.offsetHeight || POPUP_HEIGHT_ESTIMATE;

    const centeredLeft = rect.left + rect.width / 2 - width / 2;
    const left = clamp(
      centeredLeft,
      leftBound + VIEWPORT_MARGIN,
      rightBound - VIEWPORT_MARGIN - width
    );

    const spaceAbove = rect.top - NAVBAR_HEIGHT - VIEWPORT_MARGIN;
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN;
    const showBelow =
      spaceBelow >= popupHeight ||
      (spaceBelow >= 220 && spaceBelow > spaceAbove);

    const rawTop = showBelow ? rect.bottom + GAP : rect.top - popupHeight - GAP;
    const top = clamp(
      rawTop,
      NAVBAR_HEIGHT + VIEWPORT_MARGIN,
      window.innerHeight - VIEWPORT_MARGIN - Math.min(popupHeight, 420)
    );
    const maxHeight = Math.max(
      220,
      Math.min(420, window.innerHeight - top - VIEWPORT_MARGIN)
    );

    setPosition({ left, top, width, maxHeight });
  }, [anchorElement, open]);

  useLayoutEffect(() => {
    updatePosition();
  }, [updatePosition, dictionaryQuery.status]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: globalThis.MouseEvent) {
      const target = event.target as Node;
      if (
        popoverRef.current?.contains(target) ||
        anchorElement?.contains(target)
      ) {
        return;
      }

      onOpenChange(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onOpenChange(false);
      }
    }

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [anchorElement, onOpenChange, open, updatePosition]);

  useEffect(() => {
    if (!open || !popoverRef.current) return;

    const observer = new ResizeObserver(updatePosition);
    observer.observe(popoverRef.current);
    return () => observer.disconnect();
  }, [open, updatePosition]);

  function handlePlayAudio(audioUrl: string, event: MouseEvent) {
    event.stopPropagation();
    const safeUrl = audioUrl.startsWith('//') ? `https:${audioUrl}` : audioUrl;
    const audio = new Audio(safeUrl);
    audio.play().catch(() => {
      /* ignore autoplay policy errors */
    });
  }

  if (!open || !word) return null;

  const style: CSSProperties = position
    ? {
        left: position.left,
        top: position.top,
        width: position.width,
        maxHeight: position.maxHeight,
      }
    : {
        left: VIEWPORT_MARGIN,
        top: NAVBAR_HEIGHT + VIEWPORT_MARGIN,
        width: POPUP_WIDTH,
        maxHeight: 420,
      };

  const data = dictionaryQuery.data;

  return (
    <div
      ref={popoverRef}
      className="fixed z-50 flex flex-col overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-xl ring-1 ring-foreground/10"
      id="word-dictionary-popover"
      role="dialog"
      aria-label={t('title')}
      style={style}
    >
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h2 className="break-words font-bold text-2xl text-primary leading-none">
              {data?.word ?? word}
            </h2>
            {data?.phonetic && (
              <span className="font-mono text-muted-foreground text-xs">
                {data.phonetic}
              </span>
            )}
            {data?.audioUrl && (
              <button
                type="button"
                onClick={(event) =>
                  data.audioUrl && handlePlayAudio(data.audioUrl, event)
                }
                className="inline-flex size-7 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                aria-label={t('listen')}
                title={t('listen')}
              >
                <Volume2 className="size-4" />
              </button>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          aria-label={t('close')}
          title={t('close')}
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3">
        {dictionaryQuery.isLoading && (
          <div className="flex items-center justify-center gap-2 py-8">
            <Loader2 className="size-4 animate-spin text-primary" />
            <span className="text-muted-foreground text-sm">
              {t('loading')}
            </span>
          </div>
        )}

        {dictionaryQuery.isError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
            <p className="text-destructive text-sm">
              {dictionaryQuery.error.message}
            </p>
          </div>
        )}

        {data && (
          <div className="divide-y">
            {data.meanings.map((meaning, index) => (
              <div
                key={`${meaning.partOfSpeech}-${index}`}
                className={cn('space-y-2 py-3', index === 0 && 'pt-0')}
              >
                <span className="inline-flex rounded-md bg-primary/10 px-2 py-1 font-medium text-primary text-xs">
                  {meaning.partOfSpeech}
                </span>
                <p className="text-sm leading-relaxed">{meaning.definition}</p>
                {meaning.example && (
                  <p className="border-l-2 border-primary/25 pl-3 text-muted-foreground text-xs italic leading-relaxed">
                    &ldquo;{meaning.example}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
