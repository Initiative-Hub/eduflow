'use client';

import { Volume2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTextSelection } from '@/hooks/use-text-selection';

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

export function SelectionDictionary() {
  const popupRef = useRef<HTMLDivElement>(null);
  const { selectedWord, coords, placement, clearSelection } = useTextSelection({
    popupRef,
  });
  const [fetchState, setFetchState] = useState<FetchState>({ status: 'idle' });
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchDefinition = useCallback(async (word: string) => {
    // Abort any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setFetchState({ status: 'loading' });

    try {
      const response = await fetch(
        `/api/v1/dictionary?word=${encodeURIComponent(word)}`,
        { cache: 'no-store', signal: controller.signal }
      );

      if (!response.ok) {
        const errorData = await response.json();
        setFetchState({
          status: 'error',
          message: errorData.message || 'Word not found',
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
  }, []);

  useEffect(() => {
    if (selectedWord) {
      fetchDefinition(selectedWord);
    } else {
      setFetchState({ status: 'idle' });
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [selectedWord, fetchDefinition]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        clearSelection();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [clearSelection]);

  if (!selectedWord || !coords) return null;

  function handlePlayAudio(audioUrl: string) {
    const audio = new Audio(audioUrl);
    audio.play();
  }

  return (
    <div
      ref={popupRef}
      role="tooltip"
      aria-label={`Definition of ${selectedWord}`}
      className="fade-in zoom-in-95 fixed z-50 w-72 animate-in rounded-xl border border-border bg-background p-4 shadow-2xl"
      style={{
        left: `${coords.x}px`,
        top: `${coords.y}px`,
        transform:
          placement === 'above'
            ? 'translate(-50%, -100%)'
            : 'translate(-50%, 0%)',
      }}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={clearSelection}
        className="absolute top-2 right-2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Close dictionary popup"
      >
        <X className="size-4" />
      </button>

      {/* Loading state */}
      {fetchState.status === 'loading' && (
        <div className="flex items-center gap-2 py-2">
          <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-muted-foreground text-sm">Looking up...</span>
        </div>
      )}

      {/* Error state */}
      {fetchState.status === 'error' && (
        <div className="py-2">
          <p className="text-muted-foreground text-sm">{fetchState.message}</p>
        </div>
      )}

      {/* Success state */}
      {fetchState.status === 'success' && (
        <div className="flex flex-col gap-2">
          {/* Word header */}
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg text-primary">
              {fetchState.data.word}
            </h3>
            {fetchState.data.audioUrl && (
              <button
                type="button"
                onClick={() => handlePlayAudio(fetchState.data.audioUrl!)}
                className="rounded-full p-1 text-primary transition-colors hover:bg-primary/10"
                aria-label={`Play pronunciation of ${fetchState.data.word}`}
              >
                <Volume2 className="size-4" />
              </button>
            )}
          </div>

          {/* Phonetic */}
          {fetchState.data.phonetic && (
            <p className="font-mono text-muted-foreground text-sm">
              {fetchState.data.phonetic}
            </p>
          )}

          {/* Meanings */}
          <div className="max-h-[250px] overflow-y-auto">
            {fetchState.data.meanings.map((meaning) => (
              <div
                key={`${meaning.partOfSpeech}-${meaning.definition.slice(0, 20)}`}
                className="mt-2 border-border border-t pt-2 first:mt-0 first:border-t-0 first:pt-0"
              >
                <span className="rounded bg-primary/10 px-1.5 py-0.5 font-medium text-primary text-xs">
                  {meaning.partOfSpeech}
                </span>
                <p className="mt-1 text-foreground text-sm leading-relaxed">
                  {meaning.definition}
                </p>
                {meaning.example && (
                  <p className="mt-1 border-primary/30 border-l-2 pl-2 text-muted-foreground text-xs italic">
                    &ldquo;{meaning.example}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
