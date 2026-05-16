'use client';

import {
  ArrowRightLeft,
  ClipboardCopy,
  FileText,
  Languages,
  Play,
  Save,
  Share2,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { SelectionDictionary } from '@/components/dictionary/selection-dictionary';

interface VocabularyItem {
  word: string;
  phonetic: string;
  englishDefinition: string;
  vietnameseTranslation: string;
  audioUrl?: string;
}

type Direction = 'en-vi' | 'vi-en';

export function EnglishAssistantClient() {
  const t = useTranslations('StudyReader');
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [vocabularyList, setVocabularyList] = useState<VocabularyItem[]>([]);
  const [direction, setDirection] = useState<Direction>('en-vi');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const sourceRef = useRef<HTMLDivElement>(null);

  const wordCount = sourceText.trim()
    ? sourceText.trim().split(/\s+/).length
    : 0;
  const charCount = sourceText.length;

  const sourceLabel = direction === 'en-vi' ? t('english') : t('vietnamese');
  const targetLabel = direction === 'en-vi' ? t('vietnamese') : t('english');

  function handleSwapDirection() {
    setDirection((prev) => (prev === 'en-vi' ? 'vi-en' : 'en-vi'));
    const temp = sourceText;
    setSourceText(translatedText);
    setTranslatedText(temp);
  }

  function handlePlayAudio(audioUrl: string) {
    const audio = new Audio(audioUrl);
    audio.play();
  }

  function handleCopyTranslation() {
    if (translatedText) {
      navigator.clipboard.writeText(translatedText);
    }
  }

  function handleTranslateAndAnalyze() {
    if (!sourceText.trim()) return;
    setIsAnalyzing(true);

    // Placeholder — replace with actual AI call
    setTimeout(() => {
      setTranslatedText(
        'Bản dịch sẽ được tạo bởi AI khi tính năng được kết nối.'
      );
      setVocabularyList([]);
      setIsAnalyzing(false);
    }, 1500);
  }

  function handleSourceInput() {
    if (sourceRef.current) {
      setSourceText(sourceRef.current.textContent || '');
    }
  }

  return (
    <div className="space-y-5">
      <SelectionDictionary />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 font-bold text-2xl text-foreground tracking-tight">
            <Languages className="size-7 text-primary" />
            {t('english')} Assistant
          </h1>
          <p className="text-muted-foreground text-sm">{t('pageSubtitle')}</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5">
          <Sparkles className="size-4 text-primary" />
          <span className="font-medium text-primary text-xs uppercase tracking-wide">
            {t('aiAnalyticsActive')}
          </span>
        </div>
      </div>

      {/* Content Boxes with Swap Button */}
      <div className="space-y-2">
        {/* Hint */}
        <p className="text-muted-foreground text-xs italic">
          {t('highlightHint')}
        </p>

        <div className="relative grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Swap button centered between the two boxes */}
          <div className="absolute top-4 right-1/2 z-10 hidden translate-x-1/2 lg:flex">
            <button
              type="button"
              onClick={handleSwapDirection}
              className="rounded-full border bg-background p-2 shadow-sm transition-all hover:scale-110 hover:bg-muted hover:shadow-md"
              aria-label="Swap translation direction"
            >
              <ArrowRightLeft className="size-4 text-primary" />
            </button>
          </div>

          {/* Left: Source Content */}
          <div className="flex flex-col overflow-hidden rounded-xl border bg-background shadow-sm">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="rounded-md bg-primary/10 px-3 py-1.5 font-medium text-primary text-sm">
                {sourceLabel}
              </span>
              <span className="text-muted-foreground text-xs uppercase tracking-wider">
                {t('sourceContent')}
              </span>
            </div>

            {/* contentEditable so window.getSelection() works for the popup */}
            <div className="flex-1 p-6">
              <div
                ref={sourceRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleSourceInput}
                data-placeholder={t('inputPlaceholder')}
                className="min-h-[200px] w-full text-foreground text-lg leading-relaxed empty:before:text-muted-foreground/60 empty:before:content-[attr(data-placeholder)] focus:outline-none"
              />
            </div>

            {/* Footer: stats + Translate button */}
            <div className="flex items-center justify-between border-t px-4 py-3">
              <span className="text-muted-foreground text-sm">
                {charCount} {t('characters')} &bull; {wordCount} {t('words')}
              </span>
              <button
                type="button"
                onClick={handleTranslateAndAnalyze}
                disabled={!sourceText.trim() || isAnalyzing}
                className="rounded-full bg-primary px-5 py-2 font-semibold text-primary-foreground text-sm shadow-md transition-all hover:scale-105 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              >
                {isAnalyzing ? (
                  <span className="flex items-center gap-2">
                    <span className="size-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    ...
                  </span>
                ) : (
                  t('translateAndAnalyze')
                )}
              </button>
            </div>
          </div>

          {/* Mobile swap button */}
          <div className="flex justify-center lg:hidden">
            <button
              type="button"
              onClick={handleSwapDirection}
              className="rounded-full border bg-background p-2 shadow-sm transition-all hover:scale-110 hover:bg-muted hover:shadow-md"
              aria-label="Swap translation direction"
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
                <button
                  type="button"
                  onClick={handleCopyTranslation}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={t('copyTooltip')}
                >
                  <ClipboardCopy className="size-4" />
                </button>
                <button
                  type="button"
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={t('shareTooltip')}
                >
                  <Share2 className="size-4" />
                </button>
              </div>
            </div>

            <div className="relative flex-1 p-6">
              {translatedText ? (
                <div className="space-y-4">
                  <p className="text-foreground text-lg leading-relaxed">
                    {translatedText}
                  </p>
                  <button
                    type="button"
                    className="absolute top-6 right-6 rounded-full bg-primary/10 p-2 text-primary transition-colors hover:bg-primary/20"
                    aria-label={t('listenTooltip')}
                  >
                    <Volume2 className="size-5" />
                  </button>
                </div>
              ) : (
                <p className="min-h-[200px] text-lg text-muted-foreground/60 leading-relaxed">
                  {t('translationPlaceholder')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Auto-generated Key Vocabulary */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <Languages className="size-5 text-primary" />
          </div>
          <h2 className="font-bold text-foreground text-xl">{t('title')}</h2>
        </div>

        <div className="overflow-hidden rounded-xl border bg-background shadow-sm">
          <div className="grid grid-cols-[1.2fr_1fr_2.5fr_auto] items-center gap-4 border-b bg-muted/30 px-6 py-3">
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
              {t('columnAudio')}
            </span>
          </div>

          {vocabularyList.length > 0 ? (
            <div className="divide-y">
              {vocabularyList.map((vocab) => (
                <div
                  key={vocab.word}
                  className="grid grid-cols-[1.2fr_1fr_2.5fr_auto] items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/20"
                >
                  <span className="font-bold text-primary">{vocab.word}</span>
                  <span className="font-mono text-muted-foreground text-sm">
                    {vocab.phonetic}
                  </span>
                  <div>
                    <p className="text-foreground text-sm">
                      {vocab.englishDefinition}
                    </p>
                    <p className="text-muted-foreground text-xs italic">
                      {vocab.vietnameseTranslation}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      vocab.audioUrl && handlePlayAudio(vocab.audioUrl)
                    }
                    disabled={!vocab.audioUrl}
                    className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-110 disabled:bg-muted disabled:text-muted-foreground"
                    aria-label={`Play pronunciation of ${vocab.word}`}
                  >
                    <Play className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-10 text-center">
              <p className="text-muted-foreground text-sm">{t('emptyState')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      {vocabularyList.length > 0 && (
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg border bg-background px-4 py-2.5 font-medium text-foreground text-sm shadow-sm transition-colors hover:bg-muted"
          >
            <FileText className="size-4" />
            {t('exportPdf')}
          </button>
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground text-sm shadow-sm transition-colors hover:bg-primary/90"
          >
            <Save className="size-4" />
            {t('saveToLibrary')}
          </button>
        </div>
      )}
    </div>
  );
}
