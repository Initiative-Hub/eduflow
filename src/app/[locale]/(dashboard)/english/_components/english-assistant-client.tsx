'use client';

import { Languages, Lightbulb, Sparkles, Text } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { GrammarAnalysisDialog } from '@/components/english/grammar-analysis-dialog';
import { SentencePlayer } from '@/components/english/sentence-player';
import { WordDictionaryPopover } from '@/components/dictionary/word-dictionary-popover';
import type { VirtualAnchor, Direction } from './translation-panel';
import { TranslationPanel } from './translation-panel';
import { VocabularyList } from './vocabulary-list';
import {
  useAnalyzeEnglishMutation,
  useGrammarAnalysisMutation,
  useTextToSpeechMutation,
  useTranslationMutation,
} from '../_hooks/use-english-assistant';

interface SourceLookup {
  word: string;
  anchorElement: VirtualAnchor;
}

export function EnglishAssistantClient() {
  const t = useTranslations('StudyReader');

  // Text state
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [direction, setDirection] = useState<Direction>('en-vi');
  const [sourceLookup, setSourceLookup] = useState<SourceLookup | null>(null);

  // Data mutations
  const translateMutation = useTranslationMutation();
  const analyzeEnglishMutation = useAnalyzeEnglishMutation();
  const grammarMutation = useGrammarAnalysisMutation();
  const ttsMutation = useTextToSpeechMutation();

  // Paragraph TTS
  const [paragraphPlayState, setParagraphPlayState] = useState<
    'idle' | 'loading' | 'playing'
  >('idle');
  const paragraphAudioRef = useRef<HTMLAudioElement | null>(null);

  // Analysis state
  const isAnalyzing =
    translateMutation.isPending || analyzeEnglishMutation.isPending;
  const englishText = direction === 'en-vi' ? sourceText : translatedText;

  // Grammar Dialog State
  const [grammarOpen, setGrammarOpen] = useState(false);
  const [grammarSentence, setGrammarSentence] = useState('');

  const clearAnalysisState = useCallback(() => {
    setTranslatedText('');
    analyzeEnglishMutation.reset();
  }, [analyzeEnglishMutation]);

  function handleSourceTextChange(value: string) {
    setSourceText(value);
    if (!value.trim()) {
      clearAnalysisState();
      setSourceLookup(null);
    }
  }

  function handleSwapDirection() {
    setDirection((prev) => (prev === 'en-vi' ? 'vi-en' : 'en-vi'));
    const temp = sourceText;
    setSourceText(translatedText);
    setTranslatedText(temp);
    analyzeEnglishMutation.reset();
    setSourceLookup(null);
  }

  async function handleTranslateAndAnalyze() {
    if (!sourceText.trim()) return;
    analyzeEnglishMutation.reset();

    try {
      const from = direction === 'en-vi' ? 'en' : 'vi';
      const to = direction === 'en-vi' ? 'vi' : 'en';

      const translation = await translateMutation.mutateAsync({
        text: sourceText,
        from,
        to,
        provider: 'amazon',
      });

      setTranslatedText(translation);

      const textToAnalyze = direction === 'en-vi' ? sourceText : translation;
      await analyzeEnglishMutation.mutateAsync({ text: textToAnalyze });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[EnglishAssistant] translate+analyze error', err);
      toast.error(t('translationFailed'), { description: msg });
    }
  }

  const handlePlayParagraph = useCallback(async () => {
    if (!englishText.trim()) return;

    if (paragraphPlayState === 'playing') {
      paragraphAudioRef.current?.pause();
      paragraphAudioRef.current = null;
      setParagraphPlayState('idle');
      return;
    }

    setParagraphPlayState('loading');

    try {
      const text = englishText.slice(0, 2999);
      const url = await ttsMutation.mutateAsync({
        text,
        provider: 'polly', // Switch to 'polly' to use Amazon Polly
      });

      const audio = new Audio(url);
      paragraphAudioRef.current = audio;

      audio.addEventListener('ended', () => {
        URL.revokeObjectURL(url);
        setParagraphPlayState('idle');
      });
      audio.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        setParagraphPlayState('idle');
      });

      await audio.play();
      setParagraphPlayState('playing');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'TTS failed';
      toast.error(t('audioFailed'), { description: msg });
      setParagraphPlayState('idle');
    }
  }, [englishText, paragraphPlayState, ttsMutation, t]);

  async function handleAnalyzeGrammar(sentence: string) {
    setGrammarSentence(sentence);
    setGrammarOpen(true);
    try {
      await grammarMutation.mutateAsync({ sentence });
    } catch {
      // errors caught in mutation hook, but we don't throw up here
    }
  }

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
        sourceText={sourceText}
        onSourceTextChange={handleSourceTextChange}
        translatedText={translatedText}
        direction={direction}
        onSwapDirection={handleSwapDirection}
        isAnalyzing={isAnalyzing}
        onTranslateAndAnalyze={handleTranslateAndAnalyze}
        paragraphPlayState={paragraphPlayState}
        onPlayParagraph={handlePlayParagraph}
        onWordLookup={(word, anchor) =>
          setSourceLookup({ word, anchorElement: anchor })
        }
        onClearLookup={() => setSourceLookup(null)}
      />

      {sourceLookup && (
        <WordDictionaryPopover
          open={true}
          word={sourceLookup.word}
          anchorElement={sourceLookup.anchorElement}
          onOpenChange={(open) => {
            if (!open) setSourceLookup(null);
          }}
        />
      )}

      {/* Analysis Results */}
      {analyzeEnglishMutation.data?.sentences &&
        analyzeEnglishMutation.data.sentences.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <Text className="size-5 text-primary" />
              </div>
              <h2 className="font-bold text-foreground text-xl">
                {t('sentencesTitle')}
              </h2>
            </div>
            <div className="overflow-hidden rounded-xl border bg-background shadow-sm p-4">
              <SentencePlayer
                sentences={analyzeEnglishMutation.data.sentences}
                onAnalyzeGrammar={handleAnalyzeGrammar}
              />
            </div>
          </div>
        )}

      <VocabularyList
        vocabularyList={analyzeEnglishMutation.data?.vocabulary ?? []}
        isAnalyzing={isAnalyzing}
      />

      <GrammarAnalysisDialog
        open={grammarOpen}
        onOpenChange={setGrammarOpen}
        sentence={grammarSentence}
        analysis={grammarMutation.data ?? null}
        isLoading={grammarMutation.isPending}
      />
    </div>
  );
}
