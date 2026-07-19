'use client';

import { Volume2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDictionaryPreference } from '@/hooks/use-dictionary-preference';

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

type FetchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: DictionaryData }
  | { status: 'error'; message: string };

interface DictionaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  word: string | null;
}

export function DictionaryDialog({
  open,
  onOpenChange,
  word,
}: DictionaryDialogProps) {
  const t = useTranslations('DictionaryDialog');
  const [fetchState, setFetchState] = useState<FetchState>({ status: 'idle' });
  const abortControllerRef = useRef<AbortController | null>(null);
  const { provider } = useDictionaryPreference();

  const fetchDefinition = useCallback(
    async (searchWord: string) => {
      if (!searchWord.trim()) {
        setFetchState({ status: 'idle' });
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setFetchState({ status: 'loading' });

      try {
        const response = await fetch(
          `/api/v1/dictionary?word=${encodeURIComponent(searchWord)}&provider=${provider}`,
          { cache: 'no-store', signal: controller.signal }
        );

        if (response.status === 429) {
          const errorData = await response.json();
          toast.warning(t('rateLimitTitle') || 'Rate Limited', {
            description: t('rateLimitDescription') || 'Please try again later.',
          });
          setFetchState({
            status: 'error',
            message: errorData.message || 'Rate limited',
          });
          return;
        }

        if (!response.ok) {
          const errorData = await response.json();
          setFetchState({
            status: 'error',
            message: errorData.message || t('notFound'),
          });
          return;
        }

        const data: DictionaryData = await response.json();
        setFetchState({ status: 'success', data });
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') return;
        setFetchState({
          status: 'error',
          message: 'Failed to fetch definition',
        });
      }
    },
    [provider, t]
  );

  useEffect(() => {
    if (open && word) {
      fetchDefinition(word);
    } else {
      setFetchState({ status: 'idle' });
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [open, word, fetchDefinition]);

  function handlePlayAudio(audioUrl: string) {
    const safeUrl = audioUrl.startsWith('//') ? `https:${audioUrl}` : audioUrl;
    const audio = new Audio(safeUrl);
    audio.play().catch(() => {
      /* ignore autoplay policy errors */
    });
  }

  const dialogWord =
    fetchState.status === 'success' ? fetchState.data.word : word;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        id="dictionary-dialog"
        className="flex max-h-[80vh] flex-col overflow-hidden p-0 sm:max-w-2xl"
        aria-describedby="dictionary-content"
      >
        {/* Fixed header */}
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="font-bold text-lg">
            {dialogWord ? (
              <span>
                {t('title')}{' '}
                <span className="text-primary">&ldquo;{dialogWord}&rdquo;</span>
              </span>
            ) : (
              t('title')
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable body */}
        <div
          className="flex-1 overflow-y-auto px-6 py-5"
          id="dictionary-content"
        >
          {/* Loading state */}
          {fetchState.status === 'loading' && (
            <div className="flex items-center justify-center gap-3 py-10">
              <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-muted-foreground text-sm">
                Loading definition...
              </span>
            </div>
          )}

          {/* Error state */}
          {fetchState.status === 'error' && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3">
              <p className="text-destructive text-sm">{fetchState.message}</p>
            </div>
          )}

          {/* Success state */}
          {fetchState.status === 'success' && (
            <div className="space-y-5">
              {/* Word header */}
              <div className="flex items-center gap-3 border-b pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-2xl text-foreground">
                      {fetchState.data.word}
                    </h2>
                    {fetchState.data.audioUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          fetchState.data.audioUrl &&
                          handlePlayAudio(fetchState.data.audioUrl)
                        }
                        className="rounded-full bg-primary/10 p-1.5 text-primary transition-colors hover:bg-primary/20"
                        aria-label={t('listen')}
                        title={t('listen')}
                      >
                        <Volume2 className="size-4" />
                      </button>
                    )}
                  </div>
                  {fetchState.data.phonetic && (
                    <p className="mt-0.5 font-mono text-muted-foreground text-sm">
                      {fetchState.data.phonetic}
                    </p>
                  )}
                </div>
              </div>

              {/* Meanings */}
              <div className="space-y-4">
                {fetchState.data.meanings.map((meaning, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <p className="font-semibold text-primary text-xs uppercase tracking-wide">
                      {meaning.partOfSpeech}
                    </p>
                    <p className="text-foreground text-sm leading-relaxed">
                      {meaning.definition}
                    </p>
                    {meaning.example && (
                      <p className="border-muted-foreground/40 border-l-2 pl-3 text-muted-foreground text-sm italic">
                        &ldquo;{meaning.example}&rdquo;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Idle state */}
          {fetchState.status === 'idle' && (
            <div className="py-8 text-center">
              <p className="text-muted-foreground text-sm">{t('notFound')}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
