'use client';

import { BookMarked, Languages } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { WordDictionaryPopover } from '@/components/dictionary/word-dictionary-popover';
import { GrammarAnalysisDialog } from '@/components/english/grammar-analysis-dialog';
import { useEnglishAssistantController } from '../_hooks/use-english-assistant';
import { GrammarAnalysisSection } from './grammar-analysis-section';
import { TranslationPanel } from './translation-panel';
import { VocabularyList } from './vocabulary-list';

export function EnglishAssistantClient() {
  const t = useTranslations('StudyReader');
  const assistant = useEnglishAssistantController();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 font-bold text-2xl text-foreground tracking-tight">
            <Languages className="size-7 text-primary" />
            {t('assistantTitle')}
          </h1>
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-muted-foreground text-sm">
              {t('hoverLookupHint')}
            </span>
          </div>
        </div>
        <Link
          href="/english/wordbank"
          aria-label={t('wordbankLinkLabel', {
            count: assistant.wordbank.total,
          })}
className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-foreground/90 transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"               >
          <BookMarked
            className="size-5 text-foreground/80"
            strokeWidth={2.25}
          />
          <span className="font-normal text-base">{t('wordbank')}</span>
          <span className="text-base text-muted-foreground">
            ({assistant.wordbank.total})
          </span>
        </Link>
      </div>

      <TranslationPanel
        actions={assistant.translationPanel.actions}
        lookupActions={assistant.translationPanel.lookupActions}
        state={assistant.translationPanel.state}
      />

      {assistant.sourceLookup && (
        <WordDictionaryPopover
          open={true}
          word={assistant.sourceLookup.word}
          anchorElement={assistant.sourceLookup.anchorElement}
          onOpenChange={(open) => {
            if (!open) assistant.closeSourceLookup();
          }}
        />
      )}

      <GrammarAnalysisSection
        isAnalyzing={assistant.grammarSection.isAnalyzing}
        onAnalyzeGrammar={assistant.grammarSection.onAnalyzeGrammar}
        sentences={assistant.grammarSection.sentences}
      />

      <VocabularyList
        hasAnalysisResult={assistant.hasVocabularyAnalysisResult}
        isAnalyzing={assistant.isAnalyzing}
        vocabularyList={assistant.vocabularyList}
        wordbank={assistant.wordbank}
      />

      <GrammarAnalysisDialog
        analysis={assistant.grammarDialog.analysis}
        isLoading={assistant.grammarDialog.isLoading}
        onOpenChange={assistant.grammarDialog.onOpenChange}
        open={assistant.grammarDialog.open}
        sentence={assistant.grammarDialog.sentence}
      />
    </div>
  );
}
