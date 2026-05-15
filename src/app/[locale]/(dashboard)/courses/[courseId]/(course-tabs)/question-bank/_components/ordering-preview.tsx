'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import type { OrderingQuestion } from '@/lib/quiz-template';

interface OrderingPreviewProps {
  question: OrderingQuestion;
}

export function OrderingPreview({ question }: OrderingPreviewProps) {
  const t = useTranslations('Quiz');

  const getItemText = (itemId: string) =>
    question.items.find((item) => item.id === itemId)?.text ?? itemId;

  return (
    <div className="space-y-4">
      <p className="font-medium text-base text-foreground leading-relaxed">
        {question.prompt}
      </p>

      <div className="space-y-2">
        {question.correctOrder.map((itemId, index) => (
          <div
            key={itemId}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm"
          >
            <Badge variant="outline" className="shrink-0 font-mono text-xs">
              {index + 1}
            </Badge>
            <span className="flex-1">{getItemText(itemId)}</span>
          </div>
        ))}
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
