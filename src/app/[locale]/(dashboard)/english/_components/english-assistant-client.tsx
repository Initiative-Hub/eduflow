'use client';

import { Languages, Sparkles } from 'lucide-react';
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
        <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5">
          <Sparkles className="size-4 text-primary" />
          <span className="font-medium text-primary text-xs uppercase tracking-wide">
            {t('aiAnalyticsActive')}
          </span>
        </div>
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
