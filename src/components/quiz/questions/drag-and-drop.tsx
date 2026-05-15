'use client';

import { CheckCircle2, GripVertical, Undo2, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Fragment, useCallback, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type {
  DisplaySafe,
  DragAndDropQuestion,
} from '@/lib/quiz-template/types';
import { cn } from '@/lib/utils';

interface DragAndDropProps {
  question: DisplaySafe<DragAndDropQuestion>;
  placements: Record<string, string>;
  onPlace: (placements: Record<string, string>) => void;
  showResult?: boolean;
  disabled?: boolean;
}

export function DragAndDrop({
  question,
  placements,
  onPlace,
  showResult = false,
  disabled = false,
}: DragAndDropProps) {
  const t = useTranslations('Quiz');
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  // Items that have been placed in zones
  const placedItemIds = useMemo(
    () => new Set(Object.values(placements)),
    [placements]
  );

  // Available items (not yet placed)
  const availableItems = useMemo(
    () => question.items.filter((item) => !placedItemIds.has(item.id)),
    [question.items, placedItemIds]
  );

  const getItemText = useCallback(
    (itemId: string) =>
      question.items.find((item) => item.id === itemId)?.text ?? itemId,
    [question.items]
  );

  const isZoneCorrect = (zoneId: string): boolean =>
    question.correctMapping
      ? placements[zoneId] === question.correctMapping[zoneId]
      : false;

  // Parse the sentence template into segments
  const segments = useMemo(
    () => parseSentenceTemplate(question.sentenceTemplate),
    [question.sentenceTemplate]
  );

  const handleDragStart = (itemId: string) => {
    if (disabled || showResult) return;
    setDraggedItemId(itemId);
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
  };

  const handleDropOnZone = (zoneId: string) => {
    if (disabled || showResult || !draggedItemId) return;

    const newPlacements = { ...placements };

    // If this zone already has an item, remove it first
    if (newPlacements[zoneId]) {
      delete newPlacements[zoneId];
    }

    // If the dragged item was in another zone, remove it from there
    for (const [key, value] of Object.entries(newPlacements)) {
      if (value === draggedItemId) {
        delete newPlacements[key];
        break;
      }
    }

    newPlacements[zoneId] = draggedItemId;
    onPlace(newPlacements);
    setDraggedItemId(null);
  };

  const handleRemoveFromZone = (zoneId: string) => {
    if (disabled || showResult) return;
    const newPlacements = { ...placements };
    delete newPlacements[zoneId];
    onPlace(newPlacements);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Click-to-place: clicking an available item selects it, clicking a zone places it
  const handleItemClick = (itemId: string) => {
    if (disabled || showResult) return;
    setDraggedItemId((prev) => (prev === itemId ? null : itemId));
  };

  const handleZoneClick = (zoneId: string) => {
    if (disabled || showResult) return;

    if (draggedItemId) {
      handleDropOnZone(zoneId);
    }
  };

  return (
    <div className="space-y-5">
      <p className="font-medium text-base text-foreground leading-relaxed">
        {question.prompt}
      </p>

      <p className="text-muted-foreground text-sm">
        {t('dragAndDropInstruction')}
      </p>

      {/* Sentence with drop zones */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-muted/30 p-4 text-base leading-loose">
        {segments.map((segment, index) => {
          if (segment.type === 'text') {
            return (
              <span key={index} className="text-foreground">
                {segment.value}
              </span>
            );
          }

          const zoneId = segment.value;
          const placedItemId = placements[zoneId];
          const correct =
            showResult && placedItemId ? isZoneCorrect(zoneId) : undefined;
          const zone = question.zones.find((z) => z.id === zoneId);

          return (
            <span
              key={index}
              className={cn(
                'inline-flex min-w-24 items-center justify-center gap-1 rounded-md border-2 border-dashed px-3 py-1 text-sm transition-all',
                !placedItemId &&
                  !showResult &&
                  'border-primary/40 bg-primary/5',
                !placedItemId &&
                  draggedItemId &&
                  'animate-pulse border-primary bg-primary/10',
                placedItemId &&
                  !showResult &&
                  'border-primary/60 border-solid bg-primary/10',
                correct === true &&
                  'border-green-500 border-solid bg-green-50 dark:bg-green-950/20',
                correct === false &&
                  'border-red-500 border-solid bg-red-50 dark:bg-red-950/20'
              )}
              onDragOver={handleDragOver}
              onDrop={() => handleDropOnZone(zoneId)}
              onClick={() => handleZoneClick(zoneId)}
              role="button"
              tabIndex={0}
              aria-label={zone?.label ?? zoneId}
            >
              {placedItemId ? (
                <Fragment>
                  <span className="font-medium">
                    {getItemText(placedItemId)}
                  </span>
                  {!showResult && !disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="ml-1 size-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFromZone(zoneId);
                      }}
                      aria-label={t('dragAndDropRemove')}
                    >
                      <Undo2 className="size-3" />
                    </Button>
                  )}
                  {showResult && correct === true && (
                    <CheckCircle2 className="ml-1 size-4 text-green-600" />
                  )}
                  {showResult && correct === false && (
                    <XCircle className="ml-1 size-4 text-red-600" />
                  )}
                </Fragment>
              ) : (
                <span className="text-muted-foreground text-xs">
                  {zone?.label ?? '...'}
                </span>
              )}
            </span>
          );
        })}
      </div>

      {/* Show correct answers when result is shown and there are mistakes */}
      {showResult &&
        question.correctMapping &&
        Object.keys(question.correctMapping).some(
          (zoneId) => !isZoneCorrect(zoneId)
        ) && (
          <div className="flex flex-wrap gap-2">
            {question.zones
              .filter((zone) => !isZoneCorrect(zone.id))
              .map((zone) => (
                <Badge key={zone.id} variant="secondary" className="text-xs">
                  {zone.label}: {getItemText(question.correctMapping![zone.id])}
                </Badge>
              ))}
          </div>
        )}

      {/* Draggable items bank */}
      {!showResult && (
        <div className="space-y-2">
          <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
            {t('dragAndDropItemBank')}
          </p>
          <div className="flex flex-wrap gap-2">
            {availableItems.map((item) => (
              <div
                key={item.id}
                draggable={!disabled}
                onDragStart={() => handleDragStart(item.id)}
                onDragEnd={handleDragEnd}
                onClick={() => handleItemClick(item.id)}
                className={cn(
                  'flex cursor-grab select-none items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-all',
                  'border-border bg-background hover:border-primary/60 hover:bg-primary/5',
                  draggedItemId === item.id &&
                    'border-primary bg-primary/10 ring-2 ring-primary/20',
                  disabled && 'cursor-not-allowed opacity-50'
                )}
                role="button"
                tabIndex={0}
                aria-label={item.text}
              >
                <GripVertical className="size-3.5 text-muted-foreground" />
                <span>{item.text}</span>
              </div>
            ))}
            {availableItems.length === 0 && (
              <p className="text-muted-foreground text-sm italic">
                {t('dragAndDropAllPlaced')}
              </p>
            )}
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

// ─── Template Parser ─────────────────────────────────────────────────────────

interface TextSegment {
  type: 'text';
  value: string;
}

interface ZoneSegment {
  type: 'zone';
  value: string; // zone ID
}

type Segment = TextSegment | ZoneSegment;

function parseSentenceTemplate(template: string): Segment[] {
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
    segments.push({ type: 'zone', value: match[1] });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < template.length) {
    segments.push({ type: 'text', value: template.slice(lastIndex) });
  }

  return segments;
}
