'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import type { MatchingPair } from '@/lib/quiz-template';
import type { DisplaySafe, MatchingQuestion } from '@/lib/quiz-template/types';
import { cn } from '@/lib/utils';

interface MatchingQuizViewProps {
  question: DisplaySafe<MatchingQuestion>;
  pairs: MatchingPair[];
  onMatch: (pairs: MatchingPair[]) => void;
  disabled?: boolean;
}

export function MatchingQuizView({
  question,
  pairs,
  onMatch,
  disabled = false,
}: MatchingQuizViewProps) {
  const t = useTranslations('Quiz');
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);

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

  const getLeftText = (leftId: string) =>
    question.leftItems.find((item) => item.id === leftId)?.text ?? leftId;

  const getRightText = (rightId: string) =>
    question.rightItems.find((item) => item.id === rightId)?.text ?? rightId;

  const handleLeftClick = (leftId: string) => {
    if (disabled) return;
    setSelectedLeft(leftId === selectedLeft ? null : leftId);
  };

  const handleRightClick = (rightId: string) => {
    if (disabled || !selectedLeft) return;

    const updatedPairs = pairs.filter(
      (p) => p.leftId !== selectedLeft && p.rightId !== rightId
    );
    updatedPairs.push({ leftId: selectedLeft, rightId });
    onMatch(updatedPairs);
    setSelectedLeft(null);
  };

  return (
    <>
      <p className="text-muted-foreground text-sm">
        {t('matchingInstruction')}
      </p>

      {/* Matched pairs */}
      {pairs.length > 0 && (
        <div className="space-y-2">
          {pairs.map((pair) => {
            const isSelectedForRematch = selectedLeft === pair.leftId;

            return (
              <div
                key={`${pair.leftId}-${pair.rightId}`}
                className="grid grid-cols-2 gap-4"
              >
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => handleLeftClick(pair.leftId)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-all',
                    !isSelectedForRematch &&
                      'border-primary/50 bg-primary/5 hover:bg-primary/10',
                    isSelectedForRematch &&
                      'border-primary bg-primary/10 ring-1 ring-primary/20',
                    disabled && 'cursor-default'
                  )}
                >
                  <span className="flex-1">{getLeftText(pair.leftId)}</span>
                </button>

                <button
                  type="button"
                  disabled={disabled || !selectedLeft}
                  onClick={() => handleRightClick(pair.rightId)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-all',
                    'border-primary/50 bg-primary/5 hover:bg-primary/10',
                    disabled && 'cursor-default',
                    !selectedLeft && 'opacity-60'
                  )}
                >
                  <span className="flex-1">{getRightText(pair.rightId)}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Purple separator between matched and unmatched */}
      {pairs.length > 0 &&
        (unmatchedLeftItems.length > 0 || unmatchedRightItems.length > 0) && (
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-purple-300 dark:bg-purple-700" />
          </div>
        )}

      {/* Unmatched items grid */}
      {(unmatchedLeftItems.length > 0 || unmatchedRightItems.length > 0) && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            {unmatchedLeftItems.map((item) => {
              const isActive = selectedLeft === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleLeftClick(item.id)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-all',
                    !isActive && 'border-border hover:border-primary/40',
                    isActive &&
                      'border-primary bg-primary/10 ring-1 ring-primary/20',
                    disabled && 'cursor-default'
                  )}
                >
                  <span className="flex-1">{item.text}</span>
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            {unmatchedRightItems.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={disabled || !selectedLeft}
                onClick={() => handleRightClick(item.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-all',
                  'border-border hover:border-primary/40',
                  disabled && 'cursor-default',
                  !selectedLeft && 'opacity-60'
                )}
              >
                <span className="flex-1">{item.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
