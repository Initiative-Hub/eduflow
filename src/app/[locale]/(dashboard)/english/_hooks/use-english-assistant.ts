import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { GrammarAnalysis } from '@/services/english/GrammarService';
import type { TranslationProvider } from '@/services/english/TranslationService';
import type { VocabularyItem } from '@/services/english/VocabularyService';
import type {
  Direction,
  ParagraphPlayState,
  SourceLookup,
  TranslationPanelActions,
  TranslationPanelLookupActions,
  TranslationPanelState,
} from '../_types';
import {
  useRemoveVocabularyMutation,
  useSaveVocabularyMutation,
  useWordbankQuery,
} from './use-wordbank';

interface TranslateParams {
  text: string;
  from: string;
  to: string;
  provider: TranslationProvider;
}

export function useTranslationMutation() {
  return useMutation({
    mutationFn: async (params: TranslateParams) => {
      const res = await fetch('/api/v1/english/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        cache: 'no-store',
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(
          errBody.message ?? `Translation failed (${res.status})`
        );
      }

      const data = await res.json();
      return data.translatedText as string;
    },
  });
}

interface AnalyzeEnglishParams {
  text: string;
}

export function useAnalyzeEnglishMutation() {
  return useMutation({
    mutationFn: async (params: AnalyzeEnglishParams) => {
      const res = await fetch('/api/v1/english/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        cache: 'no-store',
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message ?? `Analysis failed (${res.status})`);
      }

      return res.json() as Promise<{
        vocabulary: VocabularyItem[];
        sentences: string[];
      }>;
    },
  });
}

interface GrammarAnalysisParams {
  sentence: string;
}

export function useGrammarAnalysisMutation() {
  return useMutation({
    mutationFn: async (params: GrammarAnalysisParams) => {
      const res = await fetch('/api/v1/english/grammar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        cache: 'no-store',
      });

      if (!res.ok) throw new Error('Grammar analysis failed');

      return res.json() as Promise<GrammarAnalysis>;
    },
  });
}

interface TTSParams {
  text: string;
  provider?: 'openai' | 'polly';
}

export function useTextToSpeechMutation() {
  return useMutation({
    mutationFn: async (params: TTSParams) => {
      const res = await fetch('/api/v1/english/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        cache: 'no-store',
      });

      if (!res.ok) throw new Error('TTS failed');

      const blob = await res.blob();
      return URL.createObjectURL(blob);
    },
  });
}

export function useEnglishAssistantController() {
  const t = useTranslations('StudyReader');

  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [direction, setDirection] = useState<Direction>('en-vi');
  const [sourceLookup, setSourceLookup] = useState<SourceLookup | null>(null);
  const [paragraphPlayState, setParagraphPlayState] =
    useState<ParagraphPlayState>('idle');
  const [grammarOpen, setGrammarOpen] = useState(false);
  const [grammarSentence, setGrammarSentence] = useState('');

  const paragraphAudioRef = useRef<HTMLAudioElement | null>(null);

  const translateMutation = useTranslationMutation();
  const analyzeEnglishMutation = useAnalyzeEnglishMutation();
  const grammarMutation = useGrammarAnalysisMutation();
  const ttsMutation = useTextToSpeechMutation();
  const wordbankQuery = useWordbankQuery();
  const saveVocabularyMutation = useSaveVocabularyMutation();
  const removeVocabularyMutation = useRemoveVocabularyMutation();

  const isAnalyzing =
    translateMutation.isPending || analyzeEnglishMutation.isPending;
  const englishText = direction === 'en-vi' ? sourceText : translatedText;

  const clearAnalysisState = useCallback(() => {
    setTranslatedText('');
    analyzeEnglishMutation.reset();
  }, [analyzeEnglishMutation]);

  const handleSourceTextChange = useCallback(
    (value: string) => {
      setSourceText(value);
      if (!value.trim()) {
        clearAnalysisState();
        setSourceLookup(null);
      }
    },
    [clearAnalysisState]
  );

  const handleSwapDirection = useCallback(() => {
    setDirection((prev) => (prev === 'en-vi' ? 'vi-en' : 'en-vi'));
    setSourceText(translatedText);
    setTranslatedText(sourceText);
    analyzeEnglishMutation.reset();
    setSourceLookup(null);
  }, [analyzeEnglishMutation, sourceText, translatedText]);

  const handleTranslateAndAnalyze = useCallback(async () => {
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
  }, [analyzeEnglishMutation, direction, sourceText, t, translateMutation]);

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
        provider: 'polly',
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

  const handleAnalyzeGrammar = useCallback(
    async (sentence: string) => {
      setGrammarSentence(sentence);
      setGrammarOpen(true);
      try {
        await grammarMutation.mutateAsync({ sentence });
      } catch {
        // The mutation owns the request failure state.
      }
    },
    [grammarMutation]
  );

  const translationPanelState = useMemo<TranslationPanelState>(
    () => ({
      sourceText,
      translatedText,
      direction,
      isAnalyzing,
      paragraphPlayState,
    }),
    [direction, isAnalyzing, paragraphPlayState, sourceText, translatedText]
  );

  const translationPanelActions = useMemo<TranslationPanelActions>(
    () => ({
      onSourceTextChange: handleSourceTextChange,
      onSwapDirection: handleSwapDirection,
      onTranslateAndAnalyze: handleTranslateAndAnalyze,
      onPlayParagraph: handlePlayParagraph,
    }),
    [
      handlePlayParagraph,
      handleSourceTextChange,
      handleSwapDirection,
      handleTranslateAndAnalyze,
    ]
  );

  const translationPanelLookupActions = useMemo<TranslationPanelLookupActions>(
    () => ({
      onWordLookup: (word, anchor) => {
        setSourceLookup({ word, anchorElement: anchor });
      },
      onClearLookup: () => setSourceLookup(null),
    }),
    []
  );

  const savedWordSet = useMemo(
    () => new Set(wordbankQuery.data?.savedWords ?? []),
    [wordbankQuery.data?.savedWords]
  );

  const currentVocabularyList = analyzeEnglishMutation.data?.vocabulary ?? [];
  const unsavedVocabularyList = useMemo(
    () =>
      currentVocabularyList.filter(
        (item) => !savedWordSet.has(item.word.trim().toLowerCase())
      ),
    [currentVocabularyList, savedWordSet]
  );

  const handleSaveVocabulary = useCallback(
    async (items: VocabularyItem[]) => {
      const unsavedItems = items.filter(
        (item) => !savedWordSet.has(item.word.trim().toLowerCase())
      );
      if (unsavedItems.length === 0) return;

      try {
        await saveVocabularyMutation.mutateAsync(unsavedItems);
        toast.success(t('wordbankSavedToast'));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Wordbank save failed';
        toast.error(t('wordbankSaveFailedToast'), { description: msg });
      }
    },
    [saveVocabularyMutation, savedWordSet, t]
  );

  const handleToggleVocabulary = useCallback(
    async (item: VocabularyItem) => {
      const normalizedWord = item.word.trim().toLowerCase();

      if (savedWordSet.has(normalizedWord)) {
        try {
          await removeVocabularyMutation.mutateAsync(normalizedWord);
          toast.success(t('wordbankRemovedToast'));
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : 'Wordbank remove failed';
          toast.error(t('wordbankRemoveFailedToast'), { description: msg });
        }
        return;
      }

      await handleSaveVocabulary([item]);
    },
    [handleSaveVocabulary, removeVocabularyMutation, savedWordSet, t]
  );

  return {
    sourceLookup,
    closeSourceLookup: () => setSourceLookup(null),
    grammarDialog: {
      open: grammarOpen,
      onOpenChange: setGrammarOpen,
      sentence: grammarSentence,
      analysis: grammarMutation.data ?? null,
      isLoading: grammarMutation.isPending,
    },
    grammarSection: {
      sentences: analyzeEnglishMutation.data?.sentences ?? [],
      isAnalyzing,
      onAnalyzeGrammar: handleAnalyzeGrammar,
    },
    translationPanel: {
      state: translationPanelState,
      actions: translationPanelActions,
      lookupActions: translationPanelLookupActions,
    },
    vocabularyList: currentVocabularyList,
    hasVocabularyAnalysisResult: Boolean(analyzeEnglishMutation.data),
    wordbank: {
      total: wordbankQuery.data?.total ?? 0,
      savedWords: wordbankQuery.data?.savedWords ?? [],
      unsavedCount: unsavedVocabularyList.length,
      isLoading: wordbankQuery.isLoading,
      isSaving: saveVocabularyMutation.isPending,
      isRemoving: removeVocabularyMutation.isPending,
      onSaveAll: () => handleSaveVocabulary(currentVocabularyList),
      onToggleVocabulary: handleToggleVocabulary,
    },
    isAnalyzing,
  };
}
