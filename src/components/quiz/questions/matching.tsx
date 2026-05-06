'use client';

import { CheckCircle2, Link2, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { MatchingPair, MatchingQuestion } from '@/lib/quiz-template';
import { cn } from '@/lib/utils';

interface MatchingProps {
  question: MatchingQuestion;
  pairs: MatchingPair[];
  onMatch: (pairs: MatchingPair[]) => void;
  showResult?: boolean;
  disabled?: boolean;
}

export function Matching({
  question,
  pairs,
  onMatch,
  showResult = false,
  disabled = false,
}: MatchingProps) {
  const t = useTranslations('Quiz');
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);

  const handleLeftClick = (leftId: string) => {
    if (disabled || showResult) return;
    setSelectedLeft(leftId === selectedLeft ? null : leftId);
  };

  const handleRightClick = (rightId: string) => {
    if (disabled || showResult || !selectedLeft) return;

    // Remove any existing pair with this left or right item
    const updatedPairs = pairs.filter(
      (p) => p.leftId !== selectedLeft && p.rightId !== rightId
    );
    updatedPairs.push({ leftId: selectedLeft, rightId });
    onMatch(updatedPairs);
    setSelectedLeft(null);
  };

  const getPairForLeft = (leftId: string) =>
    pairs.find((p) => p.leftId === leftId);

  const getPairForRight = (rightId: string) =>
    pairs.find((p) => p.rightId === rightId);

  const isPairCorrect = (pair: MatchingPair) =>
    question.correctPairs.some(
      (cp) => cp.leftId === pair.leftId && cp.rightId === pair.rightId
    );

  return (
    <div className="space-y-4">
      <p className="font-medium text-base text-foreground leading-relaxed">
        {question.prompt}
      </p>

      <p className="text-muted-foreground text-sm">
        {t('matchingInstruction')}
      </p>

      <div className="grid grid-cols-2 gap-4">
        {/* Left column */}
        <div className="space-y-2">
          {question.leftItems.map((item) => {
            const pair = getPairForLeft(item.id);
            const isActive = selectedLeft === item.id;
            const isMatched = Boolean(pair);
            const correct =
              showResult && pair ? isPairCorrect(pair) : undefined;

            return (
              <button
                key={item.id}
                type="button"
                disabled={disabled || showResult}
                onClick={() => handleLeftClick(item.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-all',
                  !isActive &&
                    !isMatched &&
                    'border-border hover:border-primary/40',
                  isActive &&
                    'border-primary bg-primary/10 ring-1 ring-primary/20',
                  isMatched && !showResult && 'border-primary/50 bg-primary/5',
                  correct === true &&
                    'border-green-500 bg-green-50 dark:bg-green-950/20',
                  correct === false &&
                    'border-red-500 bg-red-50 dark:bg-red-950/20',
                  (disabled || showResult) && 'cursor-default'
                )}
              >
                {showResult && correct === true && (
                  <CheckCircle2 className="size-4 shrink-0 text-green-600" />
                )}
                {showResult && correct === false && (
                  <XCircle className="size-4 shrink-0 text-red-600" />
                )}
                {isMatched && !showResult && (
                  <Link2 className="size-4 shrink-0 text-primary" />
                )}
                <span className="flex-1">{item.text}</span>
              </button>
            );
          })}
        </div>

        {/* Right column */}
        <div className="space-y-2">
          {question.rightItems.map((item) => {
            const pair = getPairForRight(item.id);
            const isMatched = Boolean(pair);
            const correct =
              showResult && pair ? isPairCorrect(pair) : undefined;

            return (
              <button
                key={item.id}
                type="button"
                disabled={disabled || showResult || !selectedLeft}
                onClick={() => handleRightClick(item.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-all',
                  !isMatched && 'border-border hover:border-primary/40',
                  isMatched && !showResult && 'border-primary/50 bg-primary/5',
                  correct === true &&
                    'border-green-500 bg-green-50 dark:bg-green-950/20',
                  correct === false &&
                    'border-red-500 bg-red-50 dark:bg-red-950/20',
                  (disabled || showResult) && 'cursor-default',
                  !selectedLeft && !showResult && 'opacity-60'
                )}
              >
                <span className="flex-1">{item.text}</span>
                {showResult && correct === true && (
                  <CheckCircle2 className="size-4 shrink-0 text-green-600" />
                )}
                {showResult && correct === false && (
                  <XCircle className="size-4 shrink-0 text-red-600" />
                )}
              </button>
            );
          })}
        </div>
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
