'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2, Volume2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type MouseEvent, useRef } from 'react';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/components/ui/popover';
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

// Can be an HTMLElement or a virtual anchor from text selection
export type PopoverAnchorElement = { getBoundingClientRect: () => DOMRect };

interface WordDictionaryPopoverProps {
  open: boolean;
  word: string | null;
  anchorElement: PopoverAnchorElement | null;
  onOpenChange: (open: boolean) => void;
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

  const dictionaryQuery = useQuery({
    queryKey: ['dictionary', 'mw-collegiate', word],
    queryFn: () => fetchDictionaryEntry(word ?? ''),
    enabled: open && Boolean(word),
    staleTime: 1000 * 60 * 60,
  });

  const virtualRef = useRef<PopoverAnchorElement | null>(null);
  if (anchorElement) {
    virtualRef.current = anchorElement;
  }

  function handlePlayAudio(audioUrl: string, event: MouseEvent) {
    event.stopPropagation();
    const safeUrl = audioUrl.startsWith('//') ? `https:${audioUrl}` : audioUrl;
    const audio = new Audio(safeUrl);
    audio.play().catch(() => {
      /* ignore autoplay policy errors */
    });
  }

  if (!word) return null;

  const data = dictionaryQuery.data;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor virtualRef={virtualRef as any} />
      <PopoverContent
        align="center"
        side="bottom"
        sideOffset={8}
        avoidCollisions={true}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="z-50 flex w-[320px] flex-col overflow-hidden p-0 shadow-xl"
        id="word-dictionary-popover"
        aria-label={t('title')}
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

        <div className="max-h-[300px] min-h-[100px] flex-1 overflow-y-auto px-4 pt-3 pb-4">
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
                  <p className="text-sm leading-relaxed">
                    {meaning.definition}
                  </p>
                  {meaning.example && (
                    <p className="border-primary/25 border-l-2 pl-3 text-muted-foreground text-xs italic leading-relaxed">
                      &ldquo;{meaning.example}&rdquo;
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
