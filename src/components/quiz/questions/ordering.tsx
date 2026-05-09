'use client';

import { CheckCircle2, GripVertical, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
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
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(
    null
  );
  const dragNodeRef = useRef<number | null>(null);

  const isItemInCorrectPosition = (itemId: string, index: number) =>
    question.correctOrder[index] === itemId;

  const getItemText = (itemId: string) =>
    question.items.find((item) => item.id === itemId)?.text ?? itemId;

  const handleDragStart = useCallback(
    (index: number) => {
      if (disabled || showResult) return;
      dragNodeRef.current = index;
      setDraggedIndex(index);
    },
    [disabled, showResult]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (disabled || showResult) return;
      if (dragNodeRef.current === null) return;

      // Determine if we should show indicator above or below based on mouse position
      const rect = e.currentTarget.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const insertIndex = e.clientY < midY ? index : index + 1;

      setDropIndicatorIndex(insertIndex);
    },
    [disabled, showResult]
  );

  const handleDragLeave = useCallback(() => {
    // Only clear if leaving the container entirely (handled by container onDragLeave)
  }, []);

  const handleContainerDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear indicator if leaving the container
    const container = e.currentTarget;
    const relatedTarget = e.relatedTarget as Node | null;
    if (relatedTarget && container.contains(relatedTarget)) return;
    setDropIndicatorIndex(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (disabled || showResult) return;
      if (dragNodeRef.current === null || dropIndicatorIndex === null) {
        setDraggedIndex(null);
        setDropIndicatorIndex(null);
        dragNodeRef.current = null;
        return;
      }

      const fromIndex = dragNodeRef.current;
      let toIndex = dropIndicatorIndex;

      // Adjust toIndex since we're removing the item first
      if (fromIndex < toIndex) {
        toIndex -= 1;
      }

      if (fromIndex !== toIndex) {
        const newOrder = [...orderedItemIds];
        const [movedItem] = newOrder.splice(fromIndex, 1);
        newOrder.splice(toIndex, 0, movedItem);
        onReorder(newOrder);
      }

      setDraggedIndex(null);
      setDropIndicatorIndex(null);
      dragNodeRef.current = null;
    },
    [disabled, showResult, dropIndicatorIndex, orderedItemIds, onReorder]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDropIndicatorIndex(null);
    dragNodeRef.current = null;
  }, []);

  return (
    <div className="space-y-4">
      <p className="font-medium text-base text-foreground leading-relaxed">
        {question.prompt}
      </p>

      <p className="text-muted-foreground text-sm">
        {t('orderingInstruction')}
      </p>

      <div
        className="space-y-0"
        onDragLeave={handleContainerDragLeave}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {orderedItemIds.map((itemId, index) => {
          const correct = showResult
            ? isItemInCorrectPosition(itemId, index)
            : undefined;
          const isDragging = draggedIndex === index;
          const showIndicatorAbove =
            dropIndicatorIndex === index && draggedIndex !== index;

          return (
            <div key={itemId} className="relative">
              {/* Drop indicator line above this item */}
              {showIndicatorAbove && (
                <div className="absolute -top-px right-0 left-0 z-10 flex items-center">
                  <div className="size-2 rounded-full bg-purple-500" />
                  <div className="h-0.5 flex-1 bg-purple-500" />
                  <div className="size-2 rounded-full bg-purple-500" />
                </div>
              )}

              <div
                draggable={!disabled && !showResult}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDragEnd={handleDragEnd}
                className={cn(
                  'mt-2 flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-all',
                  !showResult &&
                    !disabled &&
                    'cursor-grab active:cursor-grabbing',
                  !showResult && 'border-border',
                  isDragging && 'opacity-40',
                  correct === true &&
                    'border-green-500 bg-green-50 dark:bg-green-950/20',
                  correct === false &&
                    'border-red-500 bg-red-50 dark:bg-red-950/20'
                )}
              >
                <GripVertical
                  className={cn(
                    'size-4 shrink-0 text-muted-foreground',
                    !disabled && !showResult && 'cursor-grab'
                  )}
                />

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
              </div>

              {/* Drop indicator line below the last item */}
              {index === orderedItemIds.length - 1 &&
                dropIndicatorIndex === orderedItemIds.length &&
                draggedIndex !== index && (
                  <div className="absolute -bottom-px right-0 left-0 z-10 flex items-center">
                    <div className="size-2 rounded-full bg-purple-500" />
                    <div className="h-0.5 flex-1 bg-purple-500" />
                    <div className="size-2 rounded-full bg-purple-500" />
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
