'use client';

import { useEffect, useState } from 'react';
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
  const [quizStarted, setQuizStarted] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuizStarted(false);
    }
  }, [open]);

  useEffect(() => {
    setQuizStarted(false);
  }, [session?.sessionId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(44rem,calc(100dvh-2rem))] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('reviewDialogTitle')}</DialogTitle>
          <DialogDescription>{t('reviewDialogDescription')}</DialogDescription>
        </DialogHeader>
        {!quizStarted && !result ? (
          <div className="flex flex-col gap-3 rounded-xl border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-semibold text-foreground text-sm">
              {t('answerTimingLabel')}
            </span>
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
              spacing={1}
              aria-label={t('answerTimingLabel')}
              className="rounded-full bg-muted/60 p-1 shadow-inner ring-1 ring-border/70"
            >
              <ToggleGroupItem
                value="POST_QUIZ_REVIEW"
                aria-label={t('answerTimingEnd')}
                className="h-9 rounded-full px-4 text-muted-foreground hover:bg-background/70 hover:text-foreground data-[state=on]:bg-primary/10 data-[state=on]:text-primary data-[state=on]:shadow-sm data-[state=on]:ring-1 data-[state=on]:ring-primary/20"
              >
                {t('answerTimingEnd')}
              </ToggleGroupItem>
              <ToggleGroupItem
                value="INSTANT_FEEDBACK"
                aria-label={t('answerTimingInstant')}
                className="h-9 rounded-full px-4 text-muted-foreground hover:bg-background/70 hover:text-foreground data-[state=on]:bg-primary/10 data-[state=on]:text-primary data-[state=on]:shadow-sm data-[state=on]:ring-1 data-[state=on]:ring-primary/20"
              >
                {t('answerTimingInstant')}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        ) : null}
        {session ? (
          <Quiz
            deliveryMode={deliveryMode}
            instantFeedbackUrl={`/api/v1/english/wordbank/review-sessions/${session.sessionId}/check`}
            onStart={() => setQuizStarted(true)}
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
