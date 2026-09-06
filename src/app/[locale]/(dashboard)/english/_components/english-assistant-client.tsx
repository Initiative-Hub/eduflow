'use client';

import { BookMarked, Languages } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { WordDictionaryPopover } from '@/components/dictionary/word-dictionary-popover';
import { GrammarAnalysisDialog } from '@/components/english/grammar-analysis-dialog';
import { Button } from '@/components/ui/button';
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
        <Button
          asChild
          variant="outline"
          className="h-10 rounded-full border-primary/30 bg-background/80 px-4 text-foreground shadow-sm hover:border-primary/50 hover:bg-primary/5 hover:text-foreground focus-visible:ring-primary/30"
        >
          <Link
            href="/english/wordbank"
            aria-label={t('wordbankLinkLabel', {
              count: assistant.wordbank.total,
            })}
          >
            <BookMarked data-icon="inline-start" strokeWidth={2.25} />
            <span className="font-semibold text-base">{t('wordbank')}</span>
            <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-primary px-2.5 text-primary-foreground text-sm leading-none">
              {assistant.wordbank.total}
            </span>
          </Link>
        </Button>
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
