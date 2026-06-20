'use client';

import { useState } from 'react';
import { Quiz } from '@/components/quiz';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { DeliveryMode } from '@/lib/quiz-template';
import type {
  SubmitReviewSessionResult,
  WordbankReviewSessionResult,
} from '@/services/english/SavedVocabularyService';
import {
  type WordbankTranslator,
  WordbankReviewResults,
} from './wordbank-mastery';

export function WordbankReviewDialog({
  session,
  result,
  open,
  onOpenChange,
  onComplete,
  t,
}: {
  session: WordbankReviewSessionResult | null;
  result: SubmitReviewSessionResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (result: SubmitReviewSessionResult) => void;
  t: WordbankTranslator;
}) {
  const [deliveryMode, setDeliveryMode] =
    useState<DeliveryMode>('POST_QUIZ_REVIEW');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(44rem,calc(100dvh-2rem))] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('reviewDialogTitle')}</DialogTitle>
          <DialogDescription>{t('reviewDialogDescription')}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
          <span className="font-medium text-sm">{t('answerTimingLabel')}</span>
          <ToggleGroup
            type="single"
            value={deliveryMode}
            onValueChange={(value) => {
              if (
                value === 'INSTANT_FEEDBACK' ||
                value === 'POST_QUIZ_REVIEW'
              ) {
                setDeliveryMode(value);
              }
            }}
            variant="outline"
            size="sm"
            aria-label={t('answerTimingLabel')}
          >
            <ToggleGroupItem
              value="POST_QUIZ_REVIEW"
              aria-label={t('answerTimingEnd')}
            >
              {t('answerTimingEnd')}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="INSTANT_FEEDBACK"
              aria-label={t('answerTimingInstant')}
            >
              {t('answerTimingInstant')}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        {session ? (
          <Quiz
            deliveryMode={deliveryMode}
            quiz={session.quiz}
            quizId={session.sessionId}
            submitUrl={`/api/v1/english/wordbank/review-sessions/${session.sessionId}/submit`}
            onComplete={(scoreResult) =>
              onComplete(scoreResult as SubmitReviewSessionResult)
            }
          />
        ) : null}
        {result ? (
          <WordbankReviewResults results={result.masteryResults} t={t} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
