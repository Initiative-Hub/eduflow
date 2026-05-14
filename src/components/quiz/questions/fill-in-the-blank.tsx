'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Fragment } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type {
  DisplaySafe,
  FillInTheBlankQuestion,
} from '@/lib/quiz-template/types';
import { cn } from '@/lib/utils';

interface FillInTheBlankProps {
  question: DisplaySafe<FillInTheBlankQuestion>;
  filledBlanks: Record<string, string>;
  onFill: (blankId: string, value: string) => void;
  showResult?: boolean;
  disabled?: boolean;
}

export function FillInTheBlank({
  question,
  filledBlanks,
  onFill,
  showResult = false,
  disabled = false,
}: FillInTheBlankProps) {
  const t = useTranslations('Quiz');

  // Parse the template into segments (text and blanks)
  const segments = parseTemplate(question.promptTemplate);

  const isBlankCorrect = (blankId: string): boolean => {
    const blank = question.blanks.find((b) => b.id === blankId);
    const studentValue = filledBlanks[blankId];
    if (!blank || !studentValue || !blank.acceptableAnswers) return false;
    return blank.acceptableAnswers.some(
      (answer) =>
        answer.toLowerCase().trim() === studentValue.toLowerCase().trim()
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1 text-base leading-relaxed">
        {segments.map((segment, index) => {
          if (segment.type === 'text') {
            return (
              <span key={index} className="font-medium text-foreground">
                {segment.value}
              </span>
            );
          }

          const blankId = segment.value;
          const value = filledBlanks[blankId] ?? '';
          const correct = showResult ? isBlankCorrect(blankId) : undefined;
          const blank = question.blanks.find((b) => b.id === blankId);

          return (
            <span key={index} className="inline-flex items-center gap-1">
              <Input
                value={value}
                onChange={(e) => onFill(blankId, e.target.value)}
                disabled={disabled || showResult}
                placeholder="..."
                className={cn(
                  'inline-block h-8 w-32 text-center text-sm',
                  showResult &&
                    correct &&
                    'border-green-500 bg-green-50 dark:bg-green-950/20',
                  showResult &&
                    correct === false &&
                    'border-red-500 bg-red-50 dark:bg-red-950/20'
                )}
              />
              {showResult && correct && (
                <CheckCircle2 className="size-4 text-green-600" />
              )}
              {showResult && correct === false && (
                <Fragment>
                  <XCircle className="size-4 text-red-600" />
                  {blank?.acceptableAnswers?.[0] && (
                    <Badge variant="secondary" className="text-xs">
                      {blank.acceptableAnswers[0]}
                    </Badge>
                  )}
                </Fragment>
              )}
            </span>
          );
        })}
      </div>

      {showResult && question.explanation && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-800 dark:bg-blue-950/20">
          <p className="font-medium text-blue-800 dark:text-blue-200">
            {t('explanation')}
          </p>
          <p className="mt-1 text-blue-700 dark:text-blue-300">
            {question.explanation}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Template Parser ─────────────────────────────────────────────────────────

interface TextSegment {
  type: 'text';
  value: string;
}

interface BlankSegment {
  type: 'blank';
  value: string; // blank ID
}

type Segment = TextSegment | BlankSegment;

function parseTemplate(template: string): Segment[] {
  const segments: Segment[] = [];
  const regex = /\{\{(\w+)\}\}/g;
  let lastIndex = 0;

  for (
    let match = regex.exec(template);
    match !== null;
    match = regex.exec(template)
  ) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        value: template.slice(lastIndex, match.index),
      });
    }
    segments.push({ type: 'blank', value: match[1] });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < template.length) {
    segments.push({ type: 'text', value: template.slice(lastIndex) });
  }

  return segments;
}
