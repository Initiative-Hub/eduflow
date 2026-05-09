'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
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

  // Separate unmatched and matched items
  const matchedLeftIds = useMemo(
    () => new Set(pairs.map((p) => p.leftId)),
    [pairs]
  );
  const matchedRightIds = useMemo(
    () => new Set(pairs.map((p) => p.rightId)),
    [pairs]
  );

  const unmatchedLeftItems = useMemo(
    () => question.leftItems.filter((item) => !matchedLeftIds.has(item.id)),
    [question.leftItems, matchedLeftIds]
  );
  const unmatchedRightItems = useMemo(
    () => question.rightItems.filter((item) => !matchedRightIds.has(item.id)),
    [question.rightItems, matchedRightIds]
  );

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

  const isPairCorrect = (pair: MatchingPair) =>
    question.correctPairs.some(
      (cp) => cp.leftId === pair.leftId && cp.rightId === pair.rightId
    );

  const getLeftText = (leftId: string) =>
    question.leftItems.find((item) => item.id === leftId)?.text ?? leftId;

  const getRightText = (rightId: string) =>
    question.rightItems.find((item) => item.id === rightId)?.text ?? rightId;

  return (
    <div className="space-y-4">
      <p className="font-medium text-base text-foreground leading-relaxed">
        {question.prompt}
      </p>

      <p className="text-muted-foreground text-sm">
        {t('matchingInstruction')}
      </p>

      {/* Matched pairs on top — two separate items in a row */}
      {pairs.length > 0 && (
        <div className="space-y-2">
          {pairs.map((pair) => {
            const correct = showResult ? isPairCorrect(pair) : undefined;
            const isSelectedForRematch = selectedLeft === pair.leftId;

            return (
              <div
                key={`${pair.leftId}-${pair.rightId}`}
                className="grid grid-cols-2 gap-4"
              >
                {/* Left matched item */}
                <button
                  type="button"
                  disabled={disabled || showResult}
                  onClick={() => handleLeftClick(pair.leftId)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-all',
                    !showResult &&
                      !isSelectedForRematch &&
                      'border-primary/50 bg-primary/5 hover:bg-primary/10',
                    isSelectedForRematch &&
                      'border-primary bg-primary/10 ring-1 ring-primary/20',
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
                  <span className="flex-1">{getLeftText(pair.leftId)}</span>
                </button>

                {/* Right matched item */}
                <button
                  type="button"
                  disabled={disabled || showResult || !selectedLeft}
                  onClick={() => handleRightClick(pair.rightId)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-all',
                    !showResult &&
                      'border-primary/50 bg-primary/5 hover:bg-primary/10',
                    correct === true &&
                      'border-green-500 bg-green-50 dark:bg-green-950/20',
                    correct === false &&
                      'border-red-500 bg-red-50 dark:bg-red-950/20',
                    (disabled || showResult) && 'cursor-default',
                    !selectedLeft && !showResult && 'opacity-60'
                  )}
                >
                  <span className="flex-1">{getRightText(pair.rightId)}</span>
                  {showResult && correct === true && (
                    <CheckCircle2 className="size-4 shrink-0 text-green-600" />
                  )}
                  {showResult && correct === false && (
                    <XCircle className="size-4 shrink-0 text-red-600" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Unmatched items grid */}
      {(unmatchedLeftItems.length > 0 || unmatchedRightItems.length > 0) && (
        <div className="grid grid-cols-2 gap-4">
          {/* Left column - unmatched */}
          <div className="space-y-2">
            {unmatchedLeftItems.map((item) => {
              const isActive = selectedLeft === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={disabled || showResult}
                  onClick={() => handleLeftClick(item.id)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-all',
                    !isActive && 'border-border hover:border-primary/40',
                    isActive &&
                      'border-primary bg-primary/10 ring-1 ring-primary/20',
                    (disabled || showResult) && 'cursor-default'
                  )}
                >
                  <span className="flex-1">{item.text}</span>
                </button>
              );
            })}
          </div>

          {/* Right column - unmatched */}
          <div className="space-y-2">
            {unmatchedRightItems.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={disabled || showResult || !selectedLeft}
                onClick={() => handleRightClick(item.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-all',
                  'border-border hover:border-primary/40',
                  (disabled || showResult) && 'cursor-default',
                  !selectedLeft && !showResult && 'opacity-60'
                )}
              >
                <span className="flex-1">{item.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

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
