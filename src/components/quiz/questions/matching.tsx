'use client';

import { Check, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MatchingPair } from '@/lib/quiz-template';
import type { DisplayMatchingQuestion } from '@/lib/quiz-template/display-types';
import { cn } from '@/lib/utils';

interface MatchingProps {
  question: DisplayMatchingQuestion;
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
  const [highlightedItem, setHighlightedItem] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [lines, setLines] = useState<ConnectingLine[]>([]);

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
    if (showResult) {
      setHighlightedItem(highlightedItem === leftId ? null : leftId);
      return;
    }
    if (disabled) return;
    setSelectedLeft(leftId === selectedLeft ? null : leftId);
  };

  const handleRightClick = (rightId: string) => {
    if (showResult) {
      setHighlightedItem(highlightedItem === rightId ? null : rightId);
      return;
    }
    if (disabled || !selectedLeft) return;

    const updatedPairs = pairs.filter(
      (p) => p.leftId !== selectedLeft && p.rightId !== rightId
    );
    updatedPairs.push({ leftId: selectedLeft, rightId });
    onMatch(updatedPairs);
    setSelectedLeft(null);
  };

  const isPairCorrect = (pair: MatchingPair) =>
    question.correctPairs?.some(
      (cp) => cp.leftId === pair.leftId && cp.rightId === pair.rightId
    ) ?? false;

  const getLeftText = (leftId: string) =>
    question.leftItems.find((item) => item.id === leftId)?.text ?? leftId;

  const getRightText = (rightId: string) =>
    question.rightItems.find((item) => item.id === rightId)?.text ?? rightId;

  // Calculate connecting lines for result view
  // Lines connect directly to the border of the option boxes (right edge of left, left edge of right)
  const calculateLines = useCallback(() => {
    if (!showResult || !containerRef.current || !question.correctPairs) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newLines: ConnectingLine[] = [];

    // For incorrect pairs, draw line from left item to its correct right match
    for (const pair of pairs) {
      if (!isPairCorrect(pair)) {
        const correctPair = question.correctPairs.find(
          (cp) => cp.leftId === pair.leftId
        );
        if (correctPair) {
          const leftEl = itemRefs.current.get(`left-${pair.leftId}`);
          const rightEl = itemRefs.current.get(`right-${correctPair.rightId}`);
          if (leftEl && rightEl) {
            const leftRect = leftEl.getBoundingClientRect();
            const rightRect = rightEl.getBoundingClientRect();
            newLines.push({
              x1: leftRect.right - containerRect.left,
              y1: leftRect.top + leftRect.height / 2 - containerRect.top,
              x2: rightRect.left - containerRect.left,
              y2: rightRect.top + rightRect.height / 2 - containerRect.top,
              leftId: pair.leftId,
              rightId: correctPair.rightId,
            });
          }
        }
      }
    }

    // For unmatched left items, draw line to their correct right match
    for (const item of unmatchedLeftItems) {
      const correctPair = question.correctPairs.find(
        (cp) => cp.leftId === item.id
      );
      if (correctPair) {
        const leftEl = itemRefs.current.get(`left-${item.id}`);
        const rightEl = itemRefs.current.get(`right-${correctPair.rightId}`);
        if (leftEl && rightEl) {
          const leftRect = leftEl.getBoundingClientRect();
          const rightRect = rightEl.getBoundingClientRect();
          newLines.push({
            x1: leftRect.right - containerRect.left,
            y1: leftRect.top + leftRect.height / 2 - containerRect.top,
            x2: rightRect.left - containerRect.left,
            y2: rightRect.top + rightRect.height / 2 - containerRect.top,
            leftId: item.id,
            rightId: correctPair.rightId,
          });
        }
      }
    }

    setLines(newLines);
  }, [showResult, pairs, unmatchedLeftItems, question.correctPairs]);

  useEffect(() => {
    if (!showResult) {
      setLines([]);
      return;
    }
    const timer = setTimeout(calculateLines, 50);
    window.addEventListener('resize', calculateLines);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', calculateLines);
    };
  }, [showResult, calculateLines]);

  const setItemRef = (key: string, el: HTMLButtonElement | null) => {
    if (el) {
      itemRefs.current.set(key, el);
    } else {
      itemRefs.current.delete(key);
    }
  };

  // In result view, show all items in a two-column layout
  const resultLeftItems = showResult
    ? [
        ...pairs.map((p) => question.leftItems.find((i) => i.id === p.leftId)!),
        ...unmatchedLeftItems,
      ]
    : [];

  const resultRightItems = showResult
    ? [
        ...pairs.map(
          (p) => question.rightItems.find((i) => i.id === p.rightId)!
        ),
        ...unmatchedRightItems,
      ]
    : [];

  return (
    <div className="space-y-4">
      <p className="font-medium text-base text-foreground leading-relaxed">
        {question.prompt}
      </p>

      {!showResult && (
        <p className="text-muted-foreground text-sm">
          {t('matchingInstruction')}
        </p>
      )}

      {/* ─── Result View ─────────────────────────────────────────── */}
      {showResult && (
        <div ref={containerRef} className="relative">
          {/* SVG overlay for connecting lines */}
          {lines.length > 0 && (
            <svg
              className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible"
              aria-hidden="true"
            >
              {lines.map((line) => {
                const isHighlighted =
                  highlightedItem === line.leftId ||
                  highlightedItem === line.rightId;
                return (
                  <line
                    key={`${line.leftId}-${line.rightId}`}
                    x1={line.x1}
                    y1={line.y1}
                    x2={line.x2}
                    y2={line.y2}
                    stroke="rgb(147, 51, 234)"
                    strokeWidth={isHighlighted ? 2.5 : 1.2}
                    opacity={isHighlighted ? 1 : 0.55}
                    className="transition-all duration-200"
                  />
                );
              })}
            </svg>
          )}

          <div className="grid grid-cols-2 gap-8">
            {/* Left column */}
            <div className="space-y-2">
              {resultLeftItems.map((item) => {
                const pair = pairs.find((p) => p.leftId === item.id);
                const isMatched = !!pair;
                const correct = isMatched ? isPairCorrect(pair) : undefined;
                const isHighlighted = highlightedItem === item.id;

                return (
                  <button
                    key={item.id}
                    ref={(el) => setItemRef(`left-${item.id}`, el)}
                    type="button"
                    onClick={() => handleLeftClick(item.id)}
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-all',
                      correct === true &&
                        'border-green-500 bg-green-50 dark:bg-green-950/20',
                      correct === false &&
                        'border-red-500 bg-red-50 dark:bg-red-950/20',
                      !isMatched && 'border-border bg-card',
                      isHighlighted && 'ring-2 ring-purple-400/50'
                    )}
                  >
                    {correct === true && (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500 text-white">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                    )}
                    {correct === false && (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
                        <X className="h-3 w-3" strokeWidth={3} />
                      </span>
                    )}
                    <span className="flex-1">{item.text}</span>
                  </button>
                );
              })}
            </div>

            {/* Right column */}
            <div className="space-y-2">
              {resultRightItems.map((item) => {
                const pair = pairs.find((p) => p.rightId === item.id);
                const isMatched = !!pair;
                const correct = isMatched ? isPairCorrect(pair) : undefined;
                const isHighlighted = highlightedItem === item.id;

                return (
                  <button
                    key={item.id}
                    ref={(el) => setItemRef(`right-${item.id}`, el)}
                    type="button"
                    onClick={() => handleRightClick(item.id)}
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-all',
                      correct === true &&
                        'border-green-500 bg-green-50 dark:bg-green-950/20',
                      correct === false &&
                        'border-red-500 bg-red-50 dark:bg-red-950/20',
                      !isMatched && 'border-border bg-card',
                      isHighlighted && 'ring-2 ring-purple-400/50'
                    )}
                  >
                    <span className="flex-1">{item.text}</span>
                    {correct === true && (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500 text-white">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                    )}
                    {correct === false && (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
                        <X className="h-3 w-3" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── Quiz-Taking View ────────────────────────────────────── */}
      {!showResult && (
        <>
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
                      <span className="flex-1">
                        {getRightText(pair.rightId)}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Purple separator between matched and unmatched (quiz-taking only) */}
          {pairs.length > 0 &&
            (unmatchedLeftItems.length > 0 ||
              unmatchedRightItems.length > 0) && (
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-purple-300 dark:bg-purple-700" />
              </div>
            )}

          {/* Unmatched items grid */}
          {(unmatchedLeftItems.length > 0 ||
            unmatchedRightItems.length > 0) && (
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

// ─── Types ───────────────────────────────────────────────────────────────────

interface ConnectingLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  leftId: string;
  rightId: string;
}
