'use client';

import { useMutation } from '@tanstack/react-query';
import { Pause, Play, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { apiClient } from '@/lib/api/api-client';
import { cn } from '@/lib/utils';

interface SentencePlayerProps {
  sentences: string[];
  /** Called when the user clicks a sentence for grammar analysis */
  onAnalyzeGrammar?: (sentence: string) => void;
  /** className applied to the outer container */
  className?: string;
}

type PlayState = 'idle' | 'loading' | 'playing';

export function SentencePlayer({
  sentences,
  onAnalyzeGrammar,
  className,
}: SentencePlayerProps) {
  const t = useTranslations('StudyReader');
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [playState, setPlayState] = useState<PlayState>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopCurrent = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    setPlayState('idle');
    setActiveIdx(null);
  }, []);

  const ttsMutation = useMutation({
    mutationFn: async (text: string) => {
      const blob = await apiClient.post<Blob>(
        'v1/english/tts',
        { text },
        {
          responseType: 'blob',
          timeout: 60_000,
        }
      );
      return URL.createObjectURL(blob);
    },
  });

  const playSentence = useCallback(
    async (text: string, idx: number) => {
      if (activeIdx === idx && playState === 'playing') {
        stopCurrent();
        return;
      }

      stopCurrent();
      setActiveIdx(idx);
      setPlayState('loading');

      try {
        const url = await ttsMutation.mutateAsync(text);
        const audio = new Audio(url);
        audioRef.current = audio;

        audio.addEventListener('ended', () => {
          URL.revokeObjectURL(url);
          setPlayState('idle');
          setActiveIdx(null);
        });

        audio.addEventListener('error', () => {
          URL.revokeObjectURL(url);
          setPlayState('idle');
          setActiveIdx(null);
        });

        await audio.play();
        setPlayState('playing');
      } catch {
        toast.error(t('audioFailed'));
        setPlayState('idle');
        setActiveIdx(null);
      }
    },
    [activeIdx, playState, stopCurrent, ttsMutation]
  );

  if (!sentences.length) return null;

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {sentences.map((sentence, idx) => {
        const isActive = activeIdx === idx;
        const isLoading = isActive && playState === 'loading';
        const isPlaying = isActive && playState === 'playing';

        return (
          <div
            key={idx}
            className={cn(
              'group flex items-start gap-2 rounded-lg px-3 py-2.5 transition-colors',
              isActive
                ? 'border border-primary/20 bg-primary/8'
                : 'border border-transparent hover:bg-muted/50'
            )}
          >
            {/* Play button */}
            <Button
              type="button"
              id={`sentence-play-${idx}`}
              onClick={() => playSentence(sentence, idx)}
              disabled={playState === 'loading'}
              className={cn(
                'mt-0.5 rounded-full transition-all',
                isLoading ? 'gap-1 px-2 text-xs' : '',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground'
              )}
              aria-label={
                isLoading
                  ? t('loadingVoice')
                  : isPlaying
                    ? t('pauseSentence')
                    : t('playSentence')
              }
            >
              {isLoading ? (
                <Spinner className="size-3.5" />
              ) : isPlaying ? (
                <Pause className="size-3.5" />
              ) : (
                <Play className="size-3.5 translate-x-px" />
              )}
            </Button>

            <p
              className={cn(
                'flex-1 py-1 text-sm leading-relaxed',
                isActive ? 'font-medium text-foreground' : 'text-foreground/80'
              )}
            >
              {sentence}
            </p>

            {onAnalyzeGrammar && (
              <button
                type="button"
                id={`sentence-grammar-${idx}`}
                onClick={() => onAnalyzeGrammar(sentence)}
                className={cn(
                  'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'
                    : 'bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground'
                )}
                aria-label={t('analyzeGrammar')}
                title={t('analyzeGrammar')}
              >
                <Sparkles className="size-3.5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
