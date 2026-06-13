import { useMutation } from '@tanstack/react-query';
import type { GrammarAnalysis } from '@/services/english/grammar.service';
import type { TranslationProvider } from '@/services/english/translation.service';
import type { VocabularyItem } from '@/services/english/vocabulary.service';

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
