'use client';

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import type { DisplaySafe, OrderingQuestion } from '@/lib/quiz-template/types';
import { cn } from '@/lib/utils';

interface OrderingProps {
  question: DisplaySafe<OrderingQuestion>;
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const isItemInCorrectPosition = (itemId: string, index: number) =>
    question.correctOrder?.[index] === itemId;

  const getItemText = (itemId: string) =>
    question.items.find((item) => item.id === itemId)?.text ?? itemId;

  const handleDragEnd = (event: DragEndEvent) => {
    if (disabled || showResult) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedItemIds.indexOf(active.id as string);
    const newIndex = orderedItemIds.indexOf(over.id as string);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = [...orderedItemIds];
    const [movedItem] = newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, movedItem);
    onReorder(newOrder);
  };

  return (
    <div className="space-y-4">
      <p className="font-medium text-base text-foreground leading-relaxed">
        {question.prompt}
      </p>

      <p className="text-muted-foreground text-sm">
        {t('orderingInstruction')}
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={orderedItemIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {orderedItemIds.map((itemId, index) => {
              const correct = showResult
                ? isItemInCorrectPosition(itemId, index)
                : undefined;

              return (
                <SortableOrderingItem
                  key={itemId}
                  id={itemId}
                  index={index}
                  text={getItemText(itemId)}
                  correct={correct}
                  disabled={disabled || showResult}
                  correctPosition={
                    showResult
                      ? (question.correctOrder?.indexOf(itemId) ?? -1) + 1
                      : undefined
                  }
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

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

// ─── Sortable Item ───────────────────────────────────────────────────────────

interface SortableOrderingItemProps {
  id: string;
  index: number;
  text: string;
  correct?: boolean;
  disabled: boolean;
  correctPosition?: number;
}

function SortableOrderingItem({
  id,
  index,
  text,
  correct,
  disabled,
  correctPosition,
}: SortableOrderingItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-all',
        !disabled && 'cursor-grab active:cursor-grabbing',
        !disabled && 'border-border',
        isDragging && 'z-50 opacity-80 shadow-md',
        correct === true && 'border-green-500 bg-green-50 dark:bg-green-950/20',
        correct === false && 'border-red-500 bg-red-50 dark:bg-red-950/20'
      )}
    >
      <button
        type="button"
        className={cn(
          'touch-none text-muted-foreground',
          !disabled && 'cursor-grab'
        )}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4 shrink-0" />
      </button>

      <Badge variant="outline" className="shrink-0 font-mono text-xs">
        {index + 1}
      </Badge>

      <span className="flex-1">{text}</span>

      {correct !== undefined && correctPosition !== undefined && (
        <span
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-bold font-mono text-xs',
            correct
              ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400'
              : 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400'
          )}
        >
          {correctPosition}
        </span>
      )}
    </div>
  );
}
