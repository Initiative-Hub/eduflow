'use client';

import { Check, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useRef } from 'react';
import type { MatchingPair } from '@/lib/quiz-template';
import type { DisplaySafe, MatchingQuestion } from '@/lib/quiz-template/types';
import { cn } from '@/lib/utils';
import {
  type ConnectingLine,
  useConnectingLines,
} from '../hooks/use-connecting-lines';

interface MatchingResultViewProps {
  question: DisplaySafe<MatchingQuestion>;
  pairs: MatchingPair[];
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function MatchingResultView({
  question,
  pairs,
  containerRef,
}: MatchingResultViewProps) {
  const t = useTranslations('Quiz');
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());

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

  const isPairCorrect = useCallback(
    (pair: MatchingPair) =>
      question.correctPairs?.some(
        (cp) => cp.leftId === pair.leftId && cp.rightId === pair.rightId
      ) ?? false,
    [question.correctPairs]
  );

  // Build result layout items
  const resultLeftItems = useMemo(
    () => [
      ...pairs.map((p) => question.leftItems.find((i) => i.id === p.leftId)!),
      ...unmatchedLeftItems,
    ],
    [pairs, question.leftItems, unmatchedLeftItems]
  );

  const resultRightItems = useMemo(
    () => [
      ...pairs.map((p) => question.rightItems.find((i) => i.id === p.rightId)!),
      ...unmatchedRightItems,
    ],
    [pairs, question.rightItems, unmatchedRightItems]
  );

  const lines = useConnectingLines(containerRef, {
    pairs,
    correctPairs: question.correctPairs,
    itemRefs: itemRefs as React.RefObject<Map<string, HTMLElement>>,
    enabled: true,
  });

  const setItemRef = (key: string, el: HTMLButtonElement | null) => {
    if (el) {
      itemRefs.current.set(key, el);
    } else {
      itemRefs.current.delete(key);
    }
  };

  return (
    <>
      <div ref={containerRef} className="relative">
        {/* SVG overlay for connecting lines */}
        {lines.length > 0 && (
          <svg
            className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible"
            aria-hidden="true"
          >
            {lines.map((line: ConnectingLine) => (
              <line
                key={`${line.leftId}-${line.rightId}`}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke="rgb(147, 51, 234)"
                strokeWidth={1.2}
                opacity={0.55}
                className="transition-all duration-200"
              />
            ))}
          </svg>
        )}

        <div className="grid grid-cols-2 gap-8">
          {/* Left column */}
          <div className="space-y-2">
            {resultLeftItems.map((item) => {
              const pair = pairs.find((p) => p.leftId === item.id);
              const isMatched = !!pair;
              const correct = isMatched ? isPairCorrect(pair) : undefined;

              return (
                <div
                  key={item.id}
                  ref={(el) =>
                    setItemRef(
                      `left-${item.id}`,
                      el as HTMLButtonElement | null
                    )
                  }
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm',
                    correct === true &&
                      'border-green-500 bg-green-50 dark:bg-green-950/20',
                    correct === false &&
                      'border-red-500 bg-red-50 dark:bg-red-950/20',
                    !isMatched && 'border-border bg-card'
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
                </div>
              );
            })}
          </div>

          {/* Right column */}
          <div className="space-y-2">
            {resultRightItems.map((item) => {
              const pair = pairs.find((p) => p.rightId === item.id);
              const isMatched = !!pair;
              const correct = isMatched ? isPairCorrect(pair) : undefined;

              return (
                <div
                  key={item.id}
                  ref={(el) =>
                    setItemRef(
                      `right-${item.id}`,
                      el as HTMLButtonElement | null
                    )
                  }
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm',
                    correct === true &&
                      'border-green-500 bg-green-50 dark:bg-green-950/20',
                    correct === false &&
                      'border-red-500 bg-red-50 dark:bg-red-950/20',
                    !isMatched && 'border-border bg-card'
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
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {question.explanation && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-800 dark:bg-blue-950/20">
          <p className="font-medium text-blue-800 dark:text-blue-200">
            {t('explanation')}
          </p>
          <p className="mt-1 text-blue-700 dark:text-blue-300">
            {question.explanation}
          </p>
        </div>
      )}
    </>
  );
}
