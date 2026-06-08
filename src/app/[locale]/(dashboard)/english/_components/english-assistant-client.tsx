'use client';

import {
  ArrowRightLeft,
  Check,
  ClipboardCopy,
  Languages,
  Loader2,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { GrammarAnalysisDialog } from '@/components/english/grammar-analysis-dialog';
import { SentencePlayer } from '@/components/english/sentence-player';
import { DictionaryEnabledText } from '@/components/dictionary/dictionary-enabled-text';
import { WordDictionaryPopover } from '@/components/dictionary/word-dictionary-popover';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { GrammarAnalysis } from '@/services/english/grammar.service';
import type { TranslationProvider } from '@/services/english/translation.service';
import type { VocabularyItem } from '@/services/english/vocabulary.service';

type Direction = 'en-vi' | 'vi-en';
type ParagraphPlayState = 'idle' | 'loading' | 'playing';
type CopyTarget = 'source' | 'translation';

const MAX_TRANSLATION_TEXT_LENGTH = 1000;
const READING_TEXT_CLASS = 'text-base md:text-base leading-relaxed';

interface SourceLookup {
  word: string;
  anchorElement: HTMLElement;
}

interface CopyTextButtonProps {
  id: string;
  label: string;
  copiedLabel: string;
  disabled: boolean;
  copied: boolean;
  onCopy: () => void;
}

function CopyTextButton({
  id,
  label,
  copiedLabel,
  disabled,
  copied,
  onCopy,
}: CopyTextButtonProps) {
  const Icon = copied ? Check : ClipboardCopy;

  return (
    <button
      type="button"
      id={id}
      onClick={onCopy}
      disabled={disabled}
      className={cn(
        'rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50',
        copied &&
          'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary'
      )}
      aria-label={copied ? copiedLabel : label}
      title={copied ? copiedLabel : label}
    >
      <Icon className="size-4" />
    </button>
  );
}

export function EnglishAssistantClient() {
  const t = useTranslations('StudyReader');

  // ── Core text state ──────────────────────────────────────────────────────
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [direction, setDirection] = useState<Direction>('en-vi');
  const provider: TranslationProvider = 'amazon';
  const sourceTextAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const [sourceLookup, setSourceLookup] = useState<SourceLookup | null>(null);
  const [copiedTarget, setCopiedTarget] = useState<CopyTarget | null>(null);
  const copiedResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  // ── Analysis results ─────────────────────────────────────────────────────
  const [vocabularyList, setVocabularyList] = useState<VocabularyItem[]>([]);
  const [sentences, setSentences] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // ── Grammar dialog state ─────────────────────────────────────────────────
  const [grammarOpen, setGrammarOpen] = useState(false);
  const [grammarSentence, setGrammarSentence] = useState('');
  const [grammarAnalysis, setGrammarAnalysis] =
    useState<GrammarAnalysis | null>(null);
  const [isGrammarLoading, setIsGrammarLoading] = useState(false);

  // ── Paragraph TTS ────────────────────────────────────────────────────────
  const [paragraphPlayState, setParagraphPlayState] =
    useState<ParagraphPlayState>('idle');
  const paragraphAudioRef = useRef<HTMLAudioElement | null>(null);

  // ── Derived ──────────────────────────────────────────────────────────────
  const wordCount = sourceText.trim()
    ? sourceText.trim().split(/\s+/).length
    : 0;
  const charCount = sourceText.length;
  const sourceLabel = direction === 'en-vi' ? t('english') : t('vietnamese');
  const targetLabel = direction === 'en-vi' ? t('vietnamese') : t('english');

  // English text is the source when en-vi, or the translation when vi-en
  const englishText = direction === 'en-vi' ? sourceText : translatedText;

  // ── Handlers ─────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (copiedResetTimeoutRef.current) {
        clearTimeout(copiedResetTimeoutRef.current);
      }
    };
  }, []);

  function clearAnalysisState() {
    setTranslatedText('');
    setVocabularyList([]);
    setSentences([]);
    setGrammarSentence('');
    setGrammarAnalysis(null);
    setGrammarOpen(false);
    setCopiedTarget(null);
  }

  function handleSourceTextChange(value: string) {
    const limitedValue = value.slice(0, MAX_TRANSLATION_TEXT_LENGTH);
    setSourceText(limitedValue);

    if (!limitedValue.trim()) {
      clearAnalysisState();
      setSourceLookup(null);
    }
  }

  function handleSwapDirection() {
    setDirection((prev) => (prev === 'en-vi' ? 'vi-en' : 'en-vi'));
    // Swap the text content in the boxes
    const temp = sourceText;
    setSourceText(translatedText);
    setTranslatedText(temp);
    // Clear analysis results on direction swap
    setSentences([]);
    setVocabularyList([]);
    setSourceLookup(null);
    setCopiedTarget(null);
  }

  function markCopied(target: CopyTarget) {
    setCopiedTarget(target);

    if (copiedResetTimeoutRef.current) {
      clearTimeout(copiedResetTimeoutRef.current);
    }

    copiedResetTimeoutRef.current = setTimeout(() => {
      setCopiedTarget((current) => (current === target ? null : current));
    }, 1600);
  }

  async function copyTextToClipboard(text: string, target: CopyTarget) {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      markCopied(target);
    } catch (error) {
      console.error('[EnglishAssistant] copy failed', error);
    }
  }

  function handleCopyTranslation() {
    void copyTextToClipboard(translatedText, 'translation');
  }

  function handleCopySource() {
    void copyTextToClipboard(sourceText, 'source');
  }

  function handleSourceSelection() {
    const element = sourceTextAreaRef.current;
    if (!element) return;

    if (direction !== 'en-vi') {
      setSourceLookup(null);
      return;
    }

    const selected = element.value
      .slice(element.selectionStart, element.selectionEnd)
      .trim();
    const cleaned = selected.replace(/[^a-zA-Z'-]/g, '').toLowerCase();

    if (!cleaned || cleaned.length < 2 || /\s/.test(selected)) {
      setSourceLookup(null);
      return;
    }

    setSourceLookup({ word: cleaned, anchorElement: element });
  }

  // ── Translate & Analyze ───────────────────────────────────────────────────
  async function handleTranslateAndAnalyze() {
    if (!sourceText.trim()) return;
    setIsAnalyzing(true);
    setSentences([]);
    setVocabularyList([]);

    try {
      const from = direction === 'en-vi' ? 'en' : 'vi';
      const to = direction === 'en-vi' ? 'vi' : 'en';

      // Step 1: Translate
      const translateRes = await fetch('/api/v1/english/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sourceText, from, to, provider }),
        cache: 'no-store',
      });

      if (!translateRes.ok) {
        const errBody = await translateRes.json().catch(() => ({}));
        throw new Error(
          errBody.message ?? `Translation failed (${translateRes.status})`
        );
      }

      const { translatedText: translation } = await translateRes.json();
      setTranslatedText(translation);

      // Step 2: Analyze the English text for vocabulary
      // Always the English text: source for en-vi, translation for vi-en
      const textToAnalyze = direction === 'en-vi' ? sourceText : translation;

      const analyzeRes = await fetch('/api/v1/english/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToAnalyze }),
        cache: 'no-store',
      });

      if (!analyzeRes.ok) {
        const errBody = await analyzeRes.json().catch(() => ({}));
        throw new Error(
          errBody.message ?? `Analysis failed (${analyzeRes.status})`
        );
      }

      const { vocabulary, sentences: segs } = await analyzeRes.json();
      setVocabularyList(vocabulary);
      setSentences(segs);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[EnglishAssistant] translate+analyze error', err);
      toast.error(t('translationFailed'), { description: msg });
    } finally {
      setIsAnalyzing(false);
    }
  }

  // ── Paragraph TTS ─────────────────────────────────────────────────────────
  const handlePlayParagraph = useCallback(async () => {
    if (!englishText.trim()) return;

    // Toggle off if already playing
    if (paragraphPlayState === 'playing') {
      paragraphAudioRef.current?.pause();
      paragraphAudioRef.current = null;
      setParagraphPlayState('idle');
      return;
    }

    setParagraphPlayState('loading');

    try {
      // Polly has a 3000-char limit — trim to avoid 400
      const text = englishText.slice(0, 2999);

      const res = await fetch('/api/v1/english/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        cache: 'no-store',
      });

      if (!res.ok) throw new Error('TTS failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
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
  }, [englishText, paragraphPlayState]);

  // ── Grammar Analysis ──────────────────────────────────────────────────────
  async function handleAnalyzeGrammar(sentence: string) {
    setGrammarSentence(sentence);
    setGrammarAnalysis(null);
    setIsGrammarLoading(true);
    setGrammarOpen(true);

    try {
      const res = await fetch('/api/v1/english/grammar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentence }),
        cache: 'no-store',
      });

      if (!res.ok) throw new Error('Grammar analysis failed');

      const data: GrammarAnalysis = await res.json();
      setGrammarAnalysis(data);
    } catch {
      setGrammarAnalysis(null);
    } finally {
      setIsGrammarLoading(false);
    }
  }

  // ── Vocabulary audio ──────────────────────────────────────────────────────
  function handlePlayVocabAudio(audioUrl: string) {
    const safeUrl = audioUrl.startsWith('//') ? `https:${audioUrl}` : audioUrl;
    const audio = new Audio(safeUrl);
    audio.play().catch(() => {});
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 font-bold text-2xl text-foreground tracking-tight">
            <Languages className="size-7 text-primary" />
            {t('assistantTitle')}
          </h1>
          {/* <p className="text-muted-foreground text-sm">{t('pageSubtitle')}</p> */}
          <p className="text-muted-foreground text-sm">
            {t('highlightLookupHint')}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5">
          <Sparkles className="size-4 text-primary" />
          <span className="font-medium text-primary text-xs uppercase tracking-wide">
            {t('aiAnalyticsActive')}
          </span>
        </div>
      </div>

      {/* Translation Engine Selector */}
      {/* <TranslationEngineSelector value={provider} onChange={setProvider} /> */}

      <div className="relative grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Swap button (desktop) */}
        <div className="absolute top-4 right-1/2 z-10 hidden translate-x-1/2 lg:flex">
          <button
            type="button"
            onClick={handleSwapDirection}
            className="rounded-full border bg-background p-2 shadow-sm transition-all hover:scale-110 hover:bg-muted hover:shadow-md"
            aria-label={t('swapDirection')}
          >
            <ArrowRightLeft className="size-4 text-primary" />
          </button>
        </div>

        {/* Left: Source */}
        <div className="flex flex-col overflow-hidden rounded-xl border bg-background shadow-sm">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="rounded-md bg-primary/10 px-3 py-1.5 font-medium text-primary text-sm">
              {sourceLabel}
            </span>
            <div className="flex items-center gap-2">
              <CopyTextButton
                id="copy-source-btn"
                label={t('copySourceTooltip')}
                copiedLabel={t('copiedTooltip')}
                disabled={!sourceText}
                copied={copiedTarget === 'source'}
                onCopy={handleCopySource}
              />
              {/* Paragraph TTS — only when English is source */}
              {direction === 'en-vi' && sourceText.trim() && (
                <button
                  type="button"
                  id="paragraph-tts-btn"
                  onClick={handlePlayParagraph}
                  disabled={paragraphPlayState === 'loading'}
                  className={cn(
                    'flex size-8 items-center justify-center rounded-lg border transition-all',
                    paragraphPlayState === 'playing'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-primary'
                  )}
                  aria-label={t('listenTooltip')}
                >
                  {paragraphPlayState === 'loading' ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Volume2 className="size-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 p-6">
            <Textarea
              ref={sourceTextAreaRef}
              aria-label={t('sourceContent')}
              value={sourceText}
              onChange={(event) => handleSourceTextChange(event.target.value)}
              onKeyUp={handleSourceSelection}
              onMouseUp={handleSourceSelection}
              maxLength={MAX_TRANSLATION_TEXT_LENGTH}
              placeholder={t('inputPlaceholder')}
              className={cn(
                'min-h-[200px] resize-none border-0 bg-transparent p-0 shadow-none focus-visible:border-0 focus-visible:ring-0',
                READING_TEXT_CLASS
              )}
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
          </div>

          <div className="flex items-center justify-between border-t px-4 py-3">
            <span className="text-muted-foreground text-sm">
              {charCount.toLocaleString()}/
              {MAX_TRANSLATION_TEXT_LENGTH.toLocaleString()} {t('characters')}{' '}
              &bull; {wordCount} {t('words')}
            </span>
            <button
              type="button"
              id="translate-analyze-btn"
              onClick={handleTranslateAndAnalyze}
              disabled={!sourceText.trim() || isAnalyzing}
              className="rounded-full bg-primary px-5 py-2 font-semibold text-primary-foreground text-sm shadow-md transition-all hover:scale-105 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              {isAnalyzing ? (
                <span className="flex items-center gap-2">
                  <span className="size-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  {t('analyzing')}
                </span>
              ) : (
                t('translateAndAnalyze')
              )}
            </button>
          </div>
        </div>

        {/* Mobile swap */}
        <div className="flex justify-center lg:hidden">
          <button
            type="button"
            onClick={handleSwapDirection}
            className="rounded-full border bg-background p-2 shadow-sm transition-all hover:scale-110 hover:bg-muted hover:shadow-md"
            aria-label={t('swapDirection')}
          >
            <ArrowRightLeft className="size-4 text-primary" />
          </button>
        </div>

        {/* Right: Translation */}
        <div className="flex flex-col overflow-hidden rounded-xl border bg-primary/5 shadow-sm">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground text-sm">
              {targetLabel}
            </span>
            <div className="flex items-center gap-2">
              {/* Paragraph TTS — only when English is the translation target (vi-en) */}
              {direction === 'vi-en' && translatedText.trim() && (
                <button
                  type="button"
                  id="paragraph-tts-result-btn"
                  onClick={handlePlayParagraph}
                  disabled={paragraphPlayState === 'loading'}
                  className={cn(
                    'flex size-8 items-center justify-center rounded-lg border transition-all',
                    paragraphPlayState === 'playing'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-primary'
                  )}
                  aria-label={t('listenTooltip')}
                >
                  {paragraphPlayState === 'loading' ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Volume2 className="size-3.5" />
                  )}
                </button>
              )}
              <CopyTextButton
                id="copy-translation-btn"
                label={t('copyTooltip')}
                copiedLabel={t('copiedTooltip')}
                disabled={!translatedText}
                copied={copiedTarget === 'translation'}
                onCopy={handleCopyTranslation}
              />
            </div>
          </div>

          <div className="relative flex-1 p-6">
            {translatedText ? (
              <DictionaryEnabledText
                text={translatedText}
                enabled={direction === 'vi-en'}
                className={cn('text-foreground', READING_TEXT_CLASS)}
              />
            ) : (
              <p
                className={cn(
                  'min-h-[200px] text-muted-foreground/60',
                  READING_TEXT_CLASS
                )}
              >
                {t('translationPlaceholder')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Sentence Audio Player */}
      {sentences.length > 0 && (
        <SentencePlayer
          sentences={sentences}
          onAnalyzeGrammar={handleAnalyzeGrammar}
        />
      )}

      {/* Auto-generated Key Vocabulary */}
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
                <p className="text-muted-foreground text-sm">
                  {t('emptyState')}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      {/*
      {vocabularyList.length > 0 && (
        <div className="flex items-center justify-end gap-3">
          ...
        </div>
      )}
      */}

      {/* Grammar Analysis Dialog */}
      <GrammarAnalysisDialog
        open={grammarOpen}
        onOpenChange={setGrammarOpen}
        sentence={grammarSentence}
        analysis={grammarAnalysis}
        isLoading={isGrammarLoading}
      />
    </div>
  );
}
