'use client';

import { Languages, Loader2, Volume2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { VocabularyItem } from '@/services/english/VocabularyService';

interface VocabularyListProps {
  vocabularyList: VocabularyItem[];
  isAnalyzing: boolean;
}

export function VocabularyList({
  vocabularyList,
  isAnalyzing,
}: VocabularyListProps) {
  const t = useTranslations('StudyReader');

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
        <div className="grid grid-cols-[1fr_0.9fr_2fr_1.8fr] items-center gap-3 border-b bg-muted/30 px-6 py-3">
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
        </div>

        {vocabularyList.length > 0 ? (
          <div className="divide-y">
            {vocabularyList.map((vocab) => (
              <div
                key={vocab.word}
                className="grid grid-cols-[1fr_0.9fr_2fr_1.8fr] items-start gap-3 px-6 py-4 transition-colors hover:bg-muted/20"
              >
                {/* Audio button + Word + PoS */}
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    id={`vocab-audio-${vocab.word}`}
                    onClick={() =>
                      vocab.audioUrl && handlePlayVocabAudio(vocab.audioUrl)
                    }
                    disabled={!vocab.audioUrl}
                    className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-all hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                    aria-label={`Play pronunciation of ${vocab.word}`}
                  >
                    <Volume2 className="size-3.5" />
                  </button>
                  <div>
                    <span className="font-bold text-primary block">
                      {vocab.word}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      {vocab.partOfSpeech}
                    </span>
                  </div>
                </div>
                {/* IPA */}
                <span className="font-mono text-base text-muted-foreground self-center">
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
              </div>
            ))}
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
              <p className="text-muted-foreground text-sm">{t('emptyState')}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
