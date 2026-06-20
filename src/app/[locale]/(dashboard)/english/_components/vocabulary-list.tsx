'use client';

import {
  BookmarkMinus,
  BookmarkPlus,
  BookMarked,
  Languages,
  Loader2,
  Volume2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { VocabularyItem } from '@/services/english/VocabularyService';

interface VocabularyListProps {
  vocabularyList: VocabularyItem[];
  isAnalyzing: boolean;
  hasAnalysisResult: boolean;
  wordbank: {
    savedWords: string[];
    unsavedCount: number;
    isSaving: boolean;
    isRemoving: boolean;
    onSaveAll: () => void;
    onToggleVocabulary: (item: VocabularyItem) => void;
  };
}

export function VocabularyList({
  vocabularyList,
  isAnalyzing,
  hasAnalysisResult,
  wordbank,
}: VocabularyListProps) {
  const t = useTranslations('StudyReader');
  const savedWords = new Set(wordbank.savedWords);

  function handlePlayVocabAudio(audioUrl: string) {
    const safeUrl = audioUrl.startsWith('//') ? `https:${audioUrl}` : audioUrl;
    const audio = new Audio(safeUrl);
    audio.play().catch(() => {});
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
          <Languages className="size-5 text-primary" />
        </div>
        <h2 className="font-bold text-foreground text-xl">{t('title')}</h2>
      </div>

      <div className="overflow-hidden rounded-xl border bg-background shadow-sm">
        {/* Table header */}
        <div className="hidden grid-cols-[1fr_0.9fr_2fr_1.8fr_3rem] items-center gap-3 border-b bg-muted/30 px-6 py-3 lg:grid">
          <span className="font-semibold text-muted-foreground text-sm">
            {t('columnWord')}
          </span>
          <span className="font-semibold text-muted-foreground text-sm">
            {t('columnIPA')}
          </span>
          <span className="font-semibold text-muted-foreground text-sm">
            {t('columnDefinition')}
          </span>
          <span className="font-semibold text-muted-foreground text-sm">
            {t('columnExample')}
          </span>
          <span className="sr-only">{t('wordbank')}</span>
        </div>

        {vocabularyList.length > 0 ? (
          <div className="divide-y">
            {vocabularyList.map((vocab) => {
              const isSaved = savedWords.has(vocab.word.trim().toLowerCase());
              const wordbankActionLabel = isSaved
                ? t('removeFromWordbank', { word: vocab.word })
                : t('saveToWordbank', { word: vocab.word });

              return (
                <div
                  key={vocab.word}
                  className="grid items-center gap-4 px-5 py-5 transition-colors hover:bg-muted/20 lg:grid-cols-[1fr_0.9fr_2fr_1.8fr_3rem] lg:items-center lg:gap-3 lg:px-6 lg:py-4"
                >
                  {/* Audio button + Word + PoS */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      id={`vocab-audio-${vocab.word}`}
                      onClick={() =>
                        vocab.audioUrl && handlePlayVocabAudio(vocab.audioUrl)
                      }
                      disabled={!vocab.audioUrl}
                      className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-all hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                      aria-label={`Play pronunciation of ${vocab.word}`}
                    >
                      <Volume2 className="size-3.5" />
                    </button>
                    <div>
                      <span className="block font-bold text-primary">
                        {vocab.word}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        {vocab.partOfSpeech}
                      </span>
                    </div>
                  </div>
                  {/* IPA */}
                  <span className="self-center font-mono text-base text-muted-foreground">
                    {vocab.ipa ?? '—'}
                  </span>
                  {/* Definition EN + VI */}
                  <div className="self-center">
                    <p className="text-base text-foreground">
                      {vocab.englishDefinition}
                    </p>
                    <p className="mt-1 text-muted-foreground text-sm italic">
                      {vocab.vietnameseTranslation}
                    </p>
                  </div>
                  {/* Example sentence */}
                  <p className="self-center text-base text-foreground leading-relaxed">
                    &ldquo;{vocab.exampleSentence}&rdquo;
                  </p>
                  <div className="flex justify-end lg:self-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => wordbank.onToggleVocabulary(vocab)}
                      disabled={wordbank.isSaving || wordbank.isRemoving}
                      className={cn(
                        'min-h-11 min-w-11 text-muted-foreground hover:bg-primary/10 hover:text-primary',
                        isSaved && 'text-destructive hover:bg-muted/60'
                      )}
                      aria-label={wordbankActionLabel}
                      title={wordbankActionLabel}
                    >
                      {isSaved ? (
                        <BookmarkMinus className="size-5" />
                      ) : (
                        <BookmarkPlus className="size-5" />
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-10 text-center">
            {isAnalyzing ? (
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="size-5 animate-spin text-primary" />
                <p className="text-muted-foreground text-sm">
                  {t('analyzing')}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                {hasAnalysisResult ? t('emptyAnalyzedState') : t('emptyState')}
              </p>
            )}
          </div>
        )}
      </div>

      {vocabularyList.length > 0 && wordbank.unsavedCount > 0 ? (
        <div className="fixed right-5 bottom-5 z-30 md:right-8 md:bottom-8">
          <Button
            type="button"
            size="lg"
            onClick={wordbank.onSaveAll}
            disabled={wordbank.isSaving}
            className="min-h-12 rounded-full px-5 shadow-xl shadow-primary/20"
          >
            {wordbank.isSaving ? (
              <Loader2
                data-icon="inline-start"
                className="size-4 animate-spin"
              />
            ) : (
              <BookMarked data-icon="inline-start" className="size-4" />
            )}
            {t('saveAllToWordbank', { count: wordbank.unsavedCount })}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
