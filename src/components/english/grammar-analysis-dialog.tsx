'use client';

import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Lightbulb,
  Sparkles,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { GrammarAnalysis } from '@/services/english/GrammarService';

const issueTypeColors: Record<string, string> = {
  grammar: 'bg-destructive/10 text-destructive',
  spelling: 'bg-primary/10 text-primary',
  style: 'bg-accent text-accent-foreground',
  punctuation: 'bg-secondary text-secondary-foreground',
};

interface GrammarAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sentence: string;
  analysis: GrammarAnalysis | null;
  isLoading: boolean;
}

interface HighlightedSentencePart {
  text: string;
  isIssue: boolean;
}

function getHighlightedSentenceParts(
  sentence: string,
  issues: GrammarAnalysis['issues']
): HighlightedSentencePart[] {
  const ranges = issues
    .map((issue) => issue.original.trim())
    .filter(Boolean)
    .map((original) => {
      const start = sentence.toLowerCase().indexOf(original.toLowerCase());
      return start >= 0 ? { start, end: start + original.length } : null;
    })
    .filter((range): range is { start: number; end: number } => Boolean(range))
    .sort((a, b) => a.start - b.start);

  if (ranges.length === 0) return [{ text: sentence, isIssue: false }];

  const parts: HighlightedSentencePart[] = [];
  let cursor = 0;

  for (const range of ranges) {
    if (range.start < cursor) continue;
    if (range.start > cursor) {
      parts.push({
        text: sentence.slice(cursor, range.start),
        isIssue: false,
      });
    }
    parts.push({ text: sentence.slice(range.start, range.end), isIssue: true });
    cursor = range.end;
  }

  if (cursor < sentence.length) {
    parts.push({ text: sentence.slice(cursor), isIssue: false });
  }

  return parts;
}

export function GrammarAnalysisDialog({
  open,
  onOpenChange,
  sentence,
  analysis,
  isLoading,
}: GrammarAnalysisDialogProps) {
  const t = useTranslations('GrammarAnalysis');
  const highlightedSentenceParts = getHighlightedSentenceParts(
    sentence,
    analysis?.issues ?? []
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        id="grammar-analysis-dialog"
        className="max-h-[min(90vh,760px)] overflow-y-auto p-7 sm:max-w-2xl"
        aria-describedby="grammar-analysis-desc"
        showCloseButton={false}
      >
        <DialogHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <DialogTitle className="flex items-center gap-2.5 text-xl">
            <Lightbulb className="size-5 text-primary" />
            {t('title')}
          </DialogTitle>
          <DialogClose asChild>
            <button
              type="button"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-primary/30 text-foreground shadow-sm ring-4 ring-primary/15 transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25"
              aria-label={t('close')}
            >
              <X className="size-6" />
            </button>
          </DialogClose>
        </DialogHeader>

        {/* Analyzed sentence */}
        <div className="rounded-lg border bg-muted/30 px-5 py-4">
          <p className="mb-2 text-muted-foreground text-xs uppercase tracking-wide">
            {t('analyzedSentence')}
          </p>
          <DialogDescription asChild>
            <p
              id="grammar-analysis-desc"
              className="text-foreground text-sm italic leading-relaxed"
            >
              <span>&ldquo;</span>
              {highlightedSentenceParts.map((part, index) =>
                part.isIssue ? (
                  <mark
                    key={`${part.text}-${index}`}
                    className="rounded bg-destructive/15 px-1 text-destructive"
                  >
                    {part.text}
                  </mark>
                ) : (
                  <span key={`${part.text}-${index}`}>{part.text}</span>
                )
              )}
              <span>&rdquo;</span>
            </p>
          </DialogDescription>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center gap-3 py-8">
            <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-muted-foreground text-sm">
              {t('analyzing')}
            </span>
          </div>
        )}

        {/* Analysis result */}
        {!isLoading && analysis && (
          <div className="space-y-4">
            {/* Overall status */}
            <div
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2.5',
                analysis.hasErrors
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-primary/10 text-primary'
              )}
            >
              {analysis.hasErrors ? (
                <AlertCircle className="size-4 shrink-0" />
              ) : (
                <CheckCircle2 className="size-4 shrink-0" />
              )}
              <span className="font-medium text-sm">
                {analysis.hasErrors ? t('issuesFound') : t('looksGood')}
              </span>
            </div>

            {analysis.structuralMap.length > 0 ? (
              <div className="rounded-lg border bg-background px-4 py-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-foreground text-sm">
                    {t('grammarMap')}
                  </p>
                  <span className="rounded-md bg-primary/10 px-2 py-1 font-medium text-primary text-xs">
                    {analysis.tense}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {analysis.structuralMap.map((part, index) => (
                    <span
                      key={`${part.text}-${part.role}-${index}`}
                      className="inline-flex flex-col gap-1 rounded-lg border bg-muted/30 px-3 py-2"
                      title={part.explanation}
                    >
                      <span className="font-medium text-foreground text-sm">
                        {part.text}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {part.role.toLowerCase()}
                      </span>
                    </span>
                  ))}
                </div>
                {analysis.tenseExplanation && (
                  <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
                    <span className="font-medium text-foreground">
                      {t('tenseWhy')}
                    </span>{' '}
                    {analysis.tenseExplanation}
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border bg-background px-3 py-2">
                  <p className="mb-0.5 text-muted-foreground text-xs">
                    {t('structure')}
                  </p>
                  <p className="font-mono text-foreground text-xs">
                    {analysis.grammarStructure}
                  </p>
                </div>
                <div className="rounded-lg border bg-background px-3 py-2">
                  <p className="mb-0.5 text-muted-foreground text-xs">
                    {t('tense')}
                  </p>
                  <p className="font-medium text-foreground text-xs">
                    {analysis.tense}
                  </p>
                </div>
              </div>
            )}

            {/* Corrected sentence */}
            {analysis.hasErrors && analysis.correctedSentence && (
              <div className="rounded-lg border border-primary/25 bg-primary/5 px-4 py-3">
                <p className="mb-1 font-medium text-primary text-xs">
                  {t('suggestion')}
                </p>
                <p className="text-foreground text-sm leading-relaxed">
                  &ldquo;{analysis.correctedSentence}&rdquo;
                </p>
              </div>
            )}

            {/* Issues list */}
            {analysis.issues.length > 0 && (
              <div className="space-y-2">
                <p className="font-medium text-foreground text-sm">
                  {t('issues')}
                </p>
                {analysis.issues.map((issue, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-lg border bg-background px-3 py-2.5"
                  >
                    <span
                      className={cn(
                        'shrink-0 rounded px-1.5 py-0.5 font-medium text-xs capitalize',
                        issueTypeColors[issue.type] ??
                          'bg-muted text-muted-foreground'
                      )}
                    >
                      {issue.type}
                    </span>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="font-mono text-destructive line-through">
                          {issue.original}
                        </span>
                        <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
                        <span className="font-medium font-mono text-emerald-600 dark:text-emerald-400">
                          {issue.suggestion}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {issue.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!analysis.hasErrors && analysis.strengths.length > 0 && (
              <div className="rounded-lg border bg-background px-4 py-3">
                <p className="mb-3 flex items-center gap-2 font-medium text-foreground text-sm">
                  <Sparkles className="size-4 text-primary" />
                  {t('strengths')}
                </p>
                <ul className="space-y-2">
                  {analysis.strengths.map((strength, index) => (
                    <li
                      key={`${strength}-${index}`}
                      className="text-muted-foreground text-sm leading-relaxed"
                    >
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!analysis.hasErrors && analysis.styleVariations.length > 0 && (
              <div className="rounded-lg border bg-background px-4 py-3">
                <p className="mb-3 font-medium text-foreground text-sm">
                  {t('waysToSayThis')}
                </p>
                <div className="space-y-2">
                  {analysis.styleVariations.map((variation, index) => (
                    <div
                      key={`${variation.label}-${index}`}
                      className="rounded-lg bg-muted/30 px-3 py-2"
                    >
                      <p className="text-muted-foreground text-xs">
                        {variation.label}
                      </p>
                      <p className="text-foreground text-sm leading-relaxed">
                        &ldquo;{variation.sentence}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Explanation */}
            <div className="rounded-lg border border-primary/15 bg-primary/5 px-4 py-3">
              <p className="text-foreground text-sm leading-relaxed">
                {analysis.explanation}
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
