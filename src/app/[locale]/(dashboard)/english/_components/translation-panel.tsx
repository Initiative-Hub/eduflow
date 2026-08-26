'use client';

import { ArrowRightLeft, Check, ClipboardCopy, Volume2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { DictionaryEnabledEditor } from '@/components/dictionary/dictionary-enabled-editor';
import { DictionaryEnabledText } from '@/components/dictionary/dictionary-enabled-text';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type {
  TranslationPanelActions,
  TranslationPanelLookupActions,
  TranslationPanelState,
} from '../_types';

export type CopyTarget = 'source' | 'translation';

interface TranslationPanelProps {
  state: TranslationPanelState;
  actions: TranslationPanelActions;
  lookupActions: TranslationPanelLookupActions;
}

const MAX_TRANSLATION_TEXT_LENGTH = 1000;
const READING_TEXT_CLASS = 'text-lg md:text-lg leading-relaxed';

interface CopyTextButtonProps {
  id: string;
  label: string;
  copiedLabel: string;
  disabled: boolean;
  copied: boolean;
  onCopy: () => void;
}

interface SwapDirectionButtonProps {
  label: string;
  onSwapDirection: () => void;
}

function SwapDirectionButton({
  label,
  onSwapDirection,
}: SwapDirectionButtonProps) {
  return (
    <button
      type="button"
      onClick={onSwapDirection}
      className="rounded-full border bg-background p-2 shadow-sm transition-all hover:scale-110 hover:bg-muted hover:shadow-md"
      aria-label={label}
    >
      <ArrowRightLeft className="size-4 text-primary" />
    </button>
  );
}

interface PlayParagraphButtonProps {
  label: string;
  loadingLabel: string;
  playState: TranslationPanelState['paragraphPlayState'];
  onPlayParagraph: () => void;
}

function PlayParagraphButton({
  label,
  loadingLabel,
  playState,
  onPlayParagraph,
}: PlayParagraphButtonProps) {
  const isLoading = playState === 'loading';

  return (
    <Button
      type="button"
      variant="outline"
      onClick={onPlayParagraph}
      disabled={isLoading}
      className={cn(
        'h-8 transition-all',
        isLoading ? 'gap-1 px-2 text-xs' : '',
        playState === 'playing'
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-primary'
      )}
      aria-label={isLoading ? loadingLabel : label}
    >
      {isLoading ? (
        <Spinner className="size-3.5" />
      ) : (
        <Volume2 className="size-3.5" />
      )}
    </Button>
  );
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

type CopyTextHandler = (text: string, target: CopyTarget) => void;

interface SourcePaneProps {
  actions: TranslationPanelActions;
  charCount: number;
  copiedTarget: CopyTarget | null;
  label: string;
  lookupActions: TranslationPanelLookupActions;
  onCopyText: CopyTextHandler;
  state: TranslationPanelState;
  wordCount: number;
}

function SourcePane({
  actions,
  charCount,
  copiedTarget,
  label,
  lookupActions,
  onCopyText,
  state,
  wordCount,
}: SourcePaneProps) {
  const t = useTranslations('StudyReader');
  const { direction, isAnalyzing, paragraphPlayState, sourceText } = state;
  const { onPlayParagraph, onSourceTextChange, onTranslateAndAnalyze } =
    actions;
  const { onClearLookup, onWordLookup } = lookupActions;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-background shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="rounded-md bg-primary/10 px-3 py-1.5 font-medium text-primary text-sm">
          {label}
        </span>
        <div className="flex items-center gap-2">
          <CopyTextButton
            id="copy-source-btn"
            label={t('copySourceTooltip')}
            copiedLabel={t('copiedTooltip')}
            disabled={!sourceText}
            copied={copiedTarget === 'source'}
            onCopy={() => onCopyText(sourceText, 'source')}
          />
          {direction === 'en-vi' && Boolean(sourceText.trim()) && (
            <PlayParagraphButton
              label={t('listenTooltip')}
              loadingLabel={t('loadingVoice')}
              onPlayParagraph={onPlayParagraph}
              playState={paragraphPlayState}
            />
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
          ariaLabel={t('sourceContent')}
          placeholder={t('inputPlaceholder')}
          language={direction === 'en-vi' ? 'en' : 'vi'}
          className={cn(
            'min-h-50 border-0 bg-transparent p-0 shadow-none focus-visible:outline-none',
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
  );
}

interface TranslationResultPaneProps {
  actions: TranslationPanelActions;
  copiedTarget: CopyTarget | null;
  label: string;
  onCopyText: CopyTextHandler;
  state: TranslationPanelState;
}

function TranslationResultPane({
  actions,
  copiedTarget,
  label,
  onCopyText,
  state,
}: TranslationResultPaneProps) {
  const t = useTranslations('StudyReader');
  const { direction, paragraphPlayState, translatedText } = state;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-primary/5 shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground text-sm">
          {label}
        </span>
        <div className="flex items-center gap-2">
          {direction === 'vi-en' && Boolean(translatedText.trim()) && (
            <PlayParagraphButton
              label={t('listenTooltip')}
              loadingLabel={t('loadingVoice')}
              onPlayParagraph={actions.onPlayParagraph}
              playState={paragraphPlayState}
            />
          )}
          <CopyTextButton
            id="copy-translation-btn"
            label={t('copyTooltip')}
            copiedLabel={t('copiedTooltip')}
            disabled={!translatedText}
            copied={copiedTarget === 'translation'}
            onCopy={() => onCopyText(translatedText, 'translation')}
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
              'min-h-50 text-muted-foreground/60',
              READING_TEXT_CLASS
            )}
          >
            {t('translationPlaceholder')}
          </p>
        )}
      </div>
    </div>
  );
}

export function TranslationPanel({
  state,
  actions,
  lookupActions,
}: TranslationPanelProps) {
  const t = useTranslations('StudyReader');
  const { direction, sourceText } = state;
  const { onSwapDirection } = actions;
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
  const swapDirectionLabel = t('swapDirection');

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
      <div className="absolute top-4 right-1/2 z-10 hidden translate-x-1/2 lg:flex">
        <SwapDirectionButton
          label={swapDirectionLabel}
          onSwapDirection={onSwapDirection}
        />
      </div>

      <SourcePane
        actions={actions}
        charCount={charCount}
        copiedTarget={copiedTarget}
        label={sourceLabel}
        lookupActions={lookupActions}
        onCopyText={copyTextToClipboard}
        state={state}
        wordCount={wordCount}
      />

      <div className="flex justify-center lg:hidden">
        <SwapDirectionButton
          label={swapDirectionLabel}
          onSwapDirection={onSwapDirection}
        />
      </div>

      <TranslationResultPane
        actions={actions}
        copiedTarget={copiedTarget}
        label={targetLabel}
        onCopyText={copyTextToClipboard}
        state={state}
      />
    </div>
  );
}
