'use client';

import {
  ArrowRightLeft,
  Check,
  ClipboardCopy,
  Loader2,
  Volume2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SyntheticEvent,
} from 'react';
import { DictionaryEnabledText } from '@/components/dictionary/dictionary-enabled-text';
import { DictionaryEnabledEditor } from '@/components/dictionary/dictionary-enabled-editor';
import { cn } from '@/lib/utils';

export type CopyTarget = 'source' | 'translation';
export type Direction = 'en-vi' | 'vi-en';
export type VirtualAnchor = { getBoundingClientRect: () => DOMRect };

interface TranslationPanelProps {
  sourceText: string;
  onSourceTextChange: (text: string) => void;
  translatedText: string;
  direction: Direction;
  onSwapDirection: () => void;
  isAnalyzing: boolean;
  onTranslateAndAnalyze: () => void;
  paragraphPlayState: 'idle' | 'loading' | 'playing';
  onPlayParagraph: () => void;
  onWordLookup: (word: string, anchor: VirtualAnchor) => void;
  onClearLookup: () => void;
}

const MAX_TRANSLATION_TEXT_LENGTH = 1000;
const READING_TEXT_CLASS = 'text-base md:text-base leading-relaxed';

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

export function TranslationPanel({
  sourceText,
  onSourceTextChange,
  translatedText,
  direction,
  onSwapDirection,
  isAnalyzing,
  onTranslateAndAnalyze,
  paragraphPlayState,
  onPlayParagraph,
  onWordLookup,
  onClearLookup,
}: TranslationPanelProps) {
  const t = useTranslations('StudyReader');
  const [copiedTarget, setCopiedTarget] = useState<CopyTarget | null>(null);
  const copiedResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const wordCount = sourceText.trim()
    ? sourceText.trim().split(/\s+/).length
    : 0;
  const charCount = sourceText.length;
  const sourceLabel = direction === 'en-vi' ? t('english') : t('vietnamese');
  const targetLabel = direction === 'en-vi' ? t('vietnamese') : t('english');

  useEffect(() => {
    return () => {
      if (copiedResetTimeoutRef.current) {
        clearTimeout(copiedResetTimeoutRef.current);
      }
    };
  }, []);

  function markCopied(target: CopyTarget) {
    setCopiedTarget(target);
    if (copiedResetTimeoutRef.current)
      clearTimeout(copiedResetTimeoutRef.current);
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
      console.error('[TranslationPanel] copy failed', error);
    }
  }

  return (
    <div className="relative grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Swap button (desktop) */}
      <div className="absolute top-4 right-1/2 z-10 hidden translate-x-1/2 lg:flex">
        <button
          type="button"
          onClick={onSwapDirection}
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
              onCopy={() => copyTextToClipboard(sourceText, 'source')}
            />
            {direction === 'en-vi' && sourceText.trim() && (
              <button
                type="button"
                onClick={onPlayParagraph}
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
          <DictionaryEnabledEditor
            value={sourceText}
            onChange={(text) => {
              if (text.length <= MAX_TRANSLATION_TEXT_LENGTH) {
                onSourceTextChange(text);
              } else {
                onSourceTextChange(text.slice(0, MAX_TRANSLATION_TEXT_LENGTH));
              }
            }}
            onWordLookup={(word, anchor) => {
              if (direction === 'en-vi') {
                onWordLookup(word, anchor);
              }
            }}
            onClearLookup={onClearLookup}
            placeholder={t('inputPlaceholder')}
            language={direction === 'en-vi' ? 'en' : 'vi'}
            className={cn(
              'min-h-[200px] border-0 bg-transparent p-0 shadow-none focus-visible:outline-none',
              READING_TEXT_CLASS
            )}
          />
        </div>

        <div className="flex items-center justify-between border-t px-4 py-3">
          <span className="text-muted-foreground text-sm">
            {charCount.toLocaleString()}/
            {MAX_TRANSLATION_TEXT_LENGTH.toLocaleString()} {t('characters')}{' '}
            &bull; {wordCount} {t('words')}
          </span>
          <button
            type="button"
            onClick={onTranslateAndAnalyze}
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
          onClick={onSwapDirection}
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
            {direction === 'vi-en' && translatedText.trim() && (
              <button
                type="button"
                onClick={onPlayParagraph}
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
              onCopy={() => copyTextToClipboard(translatedText, 'translation')}
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
  );
}
