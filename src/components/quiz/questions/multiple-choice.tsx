'use client';

import { CheckCircle2, Circle, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type {
  DisplaySafe,
  MultipleChoiceQuestion,
} from '@/lib/quiz-template/types';
import { cn } from '@/lib/utils';

interface MultipleChoiceProps {
  question: DisplaySafe<MultipleChoiceQuestion>;
  selectedOptionId?: string;
  onSelect: (optionId: string) => void;
  showResult?: boolean;
  disabled?: boolean;
}

export function MultipleChoice({
  question,
  selectedOptionId,
  onSelect,
  showResult = false,
  disabled = false,
}: MultipleChoiceProps) {
  const t = useTranslations('Quiz');

  return (
    <div className="space-y-4">
      <p className="font-medium text-base text-foreground leading-relaxed">
        {question.prompt}
      </p>

      <div className="space-y-2">
        {question.options.map((option) => {
          const isSelected = selectedOptionId === option.id;
          const isCorrect = option.isCorrect;

          let optionState: 'default' | 'selected' | 'correct' | 'incorrect' =
            'default';
          if (showResult && isCorrect) optionState = 'correct';
          else if (showResult && isSelected && !isCorrect)
            optionState = 'incorrect';
          else if (isSelected) optionState = 'selected';

          return (
            <button
              key={option.id}
              type="button"
              disabled={disabled || showResult}
              onClick={() => onSelect(option.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all',
                optionState === 'default' &&
                  'border-border hover:border-primary/40 hover:bg-primary/5',
                optionState === 'selected' &&
                  'border-primary bg-primary/10 ring-1 ring-primary/20',
                optionState === 'correct' &&
                  'border-green-500 bg-green-50 dark:bg-green-950/20',
                optionState === 'incorrect' &&
                  'border-red-500 bg-red-50 dark:bg-red-950/20',
                (disabled || showResult) && 'cursor-default'
              )}
            >
              <span className="shrink-0">
                {optionState === 'correct' ? (
                  <CheckCircle2 className="size-5 text-green-600" />
                ) : optionState === 'incorrect' ? (
                  <XCircle className="size-5 text-red-600" />
                ) : isSelected ? (
                  <Circle className="size-5 fill-primary text-primary" />
                ) : (
                  <Circle className="size-5 text-muted-foreground" />
                )}
              </span>
              <span className="flex-1">{option.text}</span>
            </button>
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
