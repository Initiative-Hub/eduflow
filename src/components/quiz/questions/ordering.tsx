'use client';

import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  GripVertical,
  XCircle,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { OrderingQuestion } from '@/lib/quiz-template';
import { cn } from '@/lib/utils';

interface OrderingProps {
  question: OrderingQuestion;
  orderedItemIds: string[];
  onReorder: (orderedIds: string[]) => void;
  showResult?: boolean;
  disabled?: boolean;
}

export function Ordering({
  question,
  orderedItemIds,
  onReorder,
  showResult = false,
  disabled = false,
}: OrderingProps) {
  const t = useTranslations('Quiz');

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (disabled || showResult) return;
    const newOrder = [...orderedItemIds];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;

    [newOrder[index], newOrder[targetIndex]] = [
      newOrder[targetIndex],
      newOrder[index],
    ];
    onReorder(newOrder);
  };

  const isItemInCorrectPosition = (itemId: string, index: number) =>
    question.correctOrder[index] === itemId;

  const getItemText = (itemId: string) =>
    question.items.find((item) => item.id === itemId)?.text ?? itemId;

  return (
    <div className="space-y-4">
      <p className="font-medium text-base text-foreground leading-relaxed">
        {question.prompt}
      </p>

      <p className="text-muted-foreground text-sm">
        {t('orderingInstruction')}
      </p>

      <div className="space-y-2">
        {orderedItemIds.map((itemId, index) => {
          const correct = showResult
            ? isItemInCorrectPosition(itemId, index)
            : undefined;

          return (
            <div
              key={itemId}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-all',
                !showResult && 'border-border',
                correct === true &&
                  'border-green-500 bg-green-50 dark:bg-green-950/20',
                correct === false &&
                  'border-red-500 bg-red-50 dark:bg-red-950/20'
              )}
            >
              <GripVertical className="size-4 shrink-0 text-muted-foreground" />

              <Badge variant="outline" className="shrink-0 font-mono text-xs">
                {index + 1}
              </Badge>

              <span className="flex-1">{getItemText(itemId)}</span>

              {showResult && correct === true && (
                <CheckCircle2 className="size-4 shrink-0 text-green-600" />
              )}
              {showResult && correct === false && (
                <XCircle className="size-4 shrink-0 text-red-600" />
              )}

              {!showResult && !disabled && (
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    disabled={index === 0}
                    onClick={() => moveItem(index, 'up')}
                    aria-label={t('moveUp')}
                  >
                    <ArrowUp className="size-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    disabled={index === orderedItemIds.length - 1}
                    onClick={() => moveItem(index, 'down')}
                    aria-label={t('moveDown')}
                  >
                    <ArrowDown className="size-3" />
                  </Button>
                </div>
              )}
            </div>
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
