'use client';

import { Loader2, Text } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SentencePlayer } from '@/components/english/sentence-player';

interface GrammarAnalysisSectionProps {
  sentences: string[];
  isAnalyzing: boolean;
  onAnalyzeGrammar: (sentence: string) => void;
}

export function GrammarAnalysisSection({
  sentences,
  isAnalyzing,
  onAnalyzeGrammar,
}: GrammarAnalysisSectionProps) {
  const t = useTranslations('StudyReader');

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
          <Text className="size-5 text-primary" />
        </div>
        <h2 className="font-bold text-foreground text-xl">
          {t('sentencesTitle')}
        </h2>
      </div>

      <div className="overflow-hidden rounded-xl border bg-background p-4 shadow-sm">
        {sentences.length > 0 ? (
          <SentencePlayer
            sentences={sentences}
            onAnalyzeGrammar={onAnalyzeGrammar}
          />
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
                {t('sentencesEmptyState')}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
