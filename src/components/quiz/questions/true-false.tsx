'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { TrueFalseQuestion } from '@/lib/quiz-template';
import { cn } from '@/lib/utils';

interface TrueFalseProps {
  question: TrueFalseQuestion;
  selectedAnswer?: boolean;
  onSelect: (answer: boolean) => void;
  showResult?: boolean;
  disabled?: boolean;
}

export function TrueFalse({
  question,
  selectedAnswer,
  onSelect,
  showResult = false,
  disabled = false,
}: TrueFalseProps) {
  const t = useTranslations('Quiz');

  const options = [
    { value: true, label: t('true') },
    { value: false, label: t('false') },
  ];

  return (
    <div className="space-y-4">
      <p className="font-medium text-base text-foreground leading-relaxed">
        {question.prompt}
      </p>

      <div className="grid grid-cols-2 gap-3">
        {options.map((option) => {
          const isSelected = selectedAnswer === option.value;
          const isCorrect = question.correctAnswer === option.value;

          let optionState: 'default' | 'selected' | 'correct' | 'incorrect' =
            'default';
          if (showResult && isCorrect) optionState = 'correct';
          else if (showResult && isSelected && !isCorrect)
            optionState = 'incorrect';
          else if (isSelected) optionState = 'selected';

          return (
            <button
              key={String(option.value)}
              type="button"
              disabled={disabled || showResult}
              onClick={() => onSelect(option.value)}
              className={cn(
                'flex items-center justify-center gap-2 rounded-lg border px-6 py-4 font-medium text-sm transition-all',
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
              {optionState === 'correct' && (
                <CheckCircle2 className="size-5 text-green-600" />
              )}
              {optionState === 'incorrect' && (
                <XCircle className="size-5 text-red-600" />
              )}
              <span>{option.label}</span>
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
