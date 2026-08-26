'use client';

import { Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { GameQuizCopy } from '../copy';
import type { GameQuizOption } from '../types';

const OPTION_THEMES = [
  {
    letter: 'A',
    badgeClass: 'bg-rose-500 text-white shadow-xs',
    containerClass:
      'border-rose-200 bg-rose-500/5 dark:border-rose-900/50 dark:bg-rose-950/15',
    activeBorderClass:
      'border-rose-500 ring-2 ring-rose-500/25 dark:border-rose-400',
  },
  {
    letter: 'B',
    badgeClass: 'bg-sky-500 text-white shadow-xs',
    containerClass:
      'border-sky-200 bg-sky-500/5 dark:border-sky-900/50 dark:bg-sky-950/15',
    activeBorderClass:
      'border-sky-500 ring-2 ring-sky-500/25 dark:border-sky-400',
  },
  {
    letter: 'C',
    badgeClass: 'bg-amber-500 text-white shadow-xs',
    containerClass:
      'border-amber-200 bg-amber-500/5 dark:border-amber-900/50 dark:bg-amber-950/15',
    activeBorderClass:
      'border-amber-500 ring-2 ring-amber-500/25 dark:border-amber-400',
  },
  {
    letter: 'D',
    badgeClass: 'bg-emerald-500 text-white shadow-xs',
    containerClass:
      'border-emerald-200 bg-emerald-500/5 dark:border-emerald-900/50 dark:bg-emerald-950/15',
    activeBorderClass:
      'border-emerald-500 ring-2 ring-emerald-500/25 dark:border-emerald-400',
  },
] as const;

interface GameQuizAnswerOptionCardProps {
  copy: GameQuizCopy;
  isCorrect: boolean;
  onMarkCorrect: () => void;
  onRemove: () => void;
  onTextChange: (text: string) => void;
  option: GameQuizOption;
  optionIndex: number;
  questionId: string;
  totalOptions: number;
}

export function GameQuizAnswerOptionCard({
  copy,
  isCorrect,
  onMarkCorrect,
  onRemove,
  onTextChange,
  option,
  optionIndex,
  questionId,
  totalOptions,
}: GameQuizAnswerOptionCardProps) {
  const theme =
    OPTION_THEMES[optionIndex % OPTION_THEMES.length] ?? OPTION_THEMES[0];

  return (
    <div
      className={cn(
        'group relative flex flex-col gap-3 rounded-xl border p-3.5 transition-all duration-150 sm:p-4',
        theme.containerClass,
        isCorrect && theme.activeBorderClass
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'grid size-7 place-items-center rounded-lg font-black text-xs',
              theme.badgeClass
            )}
          >
            {theme.letter}
          </span>
          <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
            {copy.editor.answer} {optionIndex + 1}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Mark as Correct Pill Button */}
          <button
            type="button"
            onClick={onMarkCorrect}
            className={cn(
              'inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold text-xs transition-all duration-150',
              isCorrect
                ? 'bg-emerald-600 text-white shadow-xs dark:bg-emerald-500'
                : 'border border-border/80 bg-background/80 text-muted-foreground hover:border-emerald-500 hover:bg-emerald-50/50 hover:text-foreground dark:hover:bg-emerald-950/30'
            )}
            aria-label={`${copy.editor.correct}: ${optionIndex + 1}`}
          >
            <Check
              className={cn(
                'size-3.5 transition-transform',
                isCorrect ? 'scale-110 stroke-3' : 'opacity-50'
              )}
            />
            <span>
              {isCorrect ? copy.editor.correct : copy.editor.markCorrect}
            </span>
          </button>

          {/* Remove Option Button */}
          {totalOptions > 2 ? (
            <Button
              aria-label={copy.editor.removeAnswer}
              className="size-7 text-muted-foreground hover:text-destructive"
              onClick={onRemove}
              size="icon"
              type="button"
              variant="ghost"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="relative">
        <Input
          aria-label={`${copy.editor.answer} ${optionIndex + 1}`}
          className="h-10 bg-background/90 font-medium text-sm transition-colors focus-visible:bg-background"
          onChange={(event) => onTextChange(event.target.value)}
          placeholder={`${copy.editor.answer} ${optionIndex + 1}...`}
          value={option.text}
        />
        {/* Hidden radio for standard accessibility tree/testing compatibility */}
        <input
          aria-label={`${copy.editor.correct}: ${optionIndex + 1}`}
          checked={isCorrect}
          className="sr-only"
          name={`correct-${questionId}`}
          onChange={onMarkCorrect}
          tabIndex={-1}
          type="radio"
        />
      </div>
    </div>
  );
}
