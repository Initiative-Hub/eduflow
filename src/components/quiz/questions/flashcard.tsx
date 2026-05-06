'use client';

import { RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { FlashcardQuestion } from '@/lib/quiz-template';
import { cn } from '@/lib/utils';

interface FlashcardProps {
  question: FlashcardQuestion;
  className?: string;
}

export function Flashcard({ question, className }: FlashcardProps) {
  const t = useTranslations('Quiz');
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className={cn('space-y-3', className)}>
      <button
        type="button"
        onClick={() => setIsFlipped(!isFlipped)}
        className={cn(
          'relative flex min-h-[160px] w-full items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all',
          isFlipped
            ? 'border-primary/40 bg-primary/5'
            : 'border-border hover:border-primary/30 hover:bg-muted/30'
        )}
      >
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs uppercase tracking-wide">
            {isFlipped ? t('flashcardBack') : t('flashcardFront')}
          </p>
          <p className="font-medium text-foreground text-lg">
            {isFlipped ? question.back : question.front}
          </p>
        </div>
      </button>

      <div className="flex justify-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <RotateCcw className="size-3.5" />
          {t('flipCard')}
        </Button>
      </div>
    </div>
  );
}
