'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MatchingQuestion } from '@/lib/quiz-template';
import { cn } from '@/lib/utils';

interface ConnectingLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  leftId: string;
  rightId: string;
}

interface MatchingPreviewProps {
  question: MatchingQuestion;
}

export function MatchingPreview({ question }: MatchingPreviewProps) {
  const t = useTranslations('Quiz');
  const [highlightedItem, setHighlightedItem] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [lines, setLines] = useState<ConnectingLine[]>([]);

  // Order right items to match the left items order via correctPairs
  const orderedRightItems = question.leftItems
    .map((leftItem) => {
      const pair = question.correctPairs.find((p) => p.leftId === leftItem.id);
      return question.rightItems.find((r) => r.id === pair?.rightId);
    })
    .filter(Boolean) as typeof question.rightItems;

  const handleClick = (id: string) => {
    setHighlightedItem(highlightedItem === id ? null : id);
  };

  const setItemRef = (key: string, el: HTMLButtonElement | null) => {
    if (el) itemRefs.current.set(key, el);
    else itemRefs.current.delete(key);
  };

  // Find the paired item for highlighting
  const getHighlightedPairId = (id: string): string | null => {
    if (!highlightedItem) return null;
    const pairAsLeft = question.correctPairs.find(
      (p) => p.leftId === highlightedItem
    );
    const pairAsRight = question.correctPairs.find(
      (p) => p.rightId === highlightedItem
    );
    if (pairAsLeft && pairAsLeft.rightId === id) return highlightedItem;
    if (pairAsRight && pairAsRight.leftId === id) return highlightedItem;
    return null;
  };

  const calculateLines = useCallback(() => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newLines: ConnectingLine[] = [];

    for (const pair of question.correctPairs) {
      const leftEl = itemRefs.current.get(`left-${pair.leftId}`);
      const rightEl = itemRefs.current.get(`right-${pair.rightId}`);
      if (leftEl && rightEl) {
        const leftRect = leftEl.getBoundingClientRect();
        const rightRect = rightEl.getBoundingClientRect();
        newLines.push({
          x1: leftRect.right - containerRect.left,
          y1: leftRect.top + leftRect.height / 2 - containerRect.top,
          x2: rightRect.left - containerRect.left,
          y2: rightRect.top + rightRect.height / 2 - containerRect.top,
          leftId: pair.leftId,
          rightId: pair.rightId,
        });
      }
    }
    setLines(newLines);
  }, [question.correctPairs]);

  useEffect(() => {
    const timer = setTimeout(calculateLines, 50);
    window.addEventListener('resize', calculateLines);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', calculateLines);
    };
  }, [calculateLines]);

  return (
    <div className="space-y-4">
      <p className="font-medium text-base text-foreground leading-relaxed">
        {question.prompt}
      </p>

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
                  strokeWidth={isHighlighted ? 3.5 : 1.5}
                  opacity={isHighlighted ? 1 : 0.55}
                  className="transition-all duration-200"
                />
              );
            })}
          </svg>
        )}

        <div className="grid grid-cols-2 gap-8">
          {/* Left column — in question order */}
          <div className="space-y-2">
            {question.leftItems.map((item) => {
              const isHighlighted = highlightedItem === item.id;
              const isPaired = !!getHighlightedPairId(item.id);
              return (
                <button
                  key={item.id}
                  ref={(el) => setItemRef(`left-${item.id}`, el)}
                  type="button"
                  onClick={() => handleClick(item.id)}
                  className={cn(
                    'flex w-full cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-all',
                    'border-border bg-card',
                    (isHighlighted || isPaired) &&
                      'border-purple-300 ring-2 ring-purple-400/50'
                  )}
                >
                  <span className="flex-1">{item.text}</span>
                </button>
              );
            })}
          </div>

          {/* Right column — ordered to match left items via correctPairs */}
          <div className="space-y-2">
            {orderedRightItems.map((item) => {
              const isHighlighted = highlightedItem === item.id;
              const isPaired = !!getHighlightedPairId(item.id);
              return (
                <button
                  key={item.id}
                  ref={(el) => setItemRef(`right-${item.id}`, el)}
                  type="button"
                  onClick={() => handleClick(item.id)}
                  className={cn(
                    'flex w-full cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-all',
                    'border-border bg-card',
                    (isHighlighted || isPaired) &&
                      'border-purple-300 ring-2 ring-purple-400/50'
                  )}
                >
                  <span className="flex-1">{item.text}</span>
                </button>
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
    </div>
  );
}
