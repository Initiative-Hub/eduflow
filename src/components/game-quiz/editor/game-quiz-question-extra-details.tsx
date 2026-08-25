'use client';

import { BookOpen, ChevronDown, Lightbulb } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { GameQuizCopy } from '../copy';

interface GameQuizQuestionExtraDetailsProps {
  copy: GameQuizCopy;
  explanation: string;
  hint: string;
  onExplanationChange: (value: string) => void;
  onHintChange: (value: string) => void;
}

export function GameQuizQuestionExtraDetails({
  copy,
  explanation,
  hint,
  onExplanationChange,
  onHintChange,
}: GameQuizQuestionExtraDetailsProps) {
  const hasContent = Boolean(hint.trim() || explanation.trim());
  const [isOpen, setIsOpen] = useState(hasContent);

  return (
    <div className="rounded-xl border bg-card transition-all">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full cursor-pointer items-center justify-between rounded-xl p-3.5 text-left font-medium text-sm transition-colors hover:bg-muted/30"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Lightbulb className="size-3.5" aria-hidden="true" />
          </span>
          <span className="font-semibold text-foreground text-xs uppercase tracking-wider">
            {copy.editor.learningDetails}
          </span>
          {hasContent && !isOpen ? (
            <span className="size-2 rounded-full bg-primary" />
          ) : null}
        </div>
        <ChevronDown
          className={cn(
            'size-4 text-muted-foreground transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </button>

      {isOpen ? (
        <div className="space-y-4 border-t px-4 pt-3 pb-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="game-hint"
              className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs"
            >
              <Lightbulb className="size-3 text-amber-500" aria-hidden="true" />
              {copy.editor.hint}
            </Label>
            <Input
              id="game-hint"
              onChange={(e) => onHintChange(e.target.value)}
              placeholder="e.g. Think about the periodic table..."
              value={hint}
              className="bg-background text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="game-explanation"
              className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs"
            >
              <BookOpen className="size-3 text-primary" aria-hidden="true" />
              {copy.editor.explanation}
            </Label>
            <Textarea
              id="game-explanation"
              onChange={(e) => onExplanationChange(e.target.value)}
              placeholder="Explains why the correct answer is right after class reveals..."
              rows={2}
              value={explanation}
              className="resize-none bg-background text-sm"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
