'use client';

import { CheckCircle2, CircleDashed, Clock3, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ReviewQuestionRenderer } from '@/components/quiz/review-question-renderer';
import { Badge } from '@/components/ui/badge';
import type {
  QuestionBlock,
  QuestionResult,
  StudentAnswer,
} from '@/lib/quiz-template/types';
import { cn } from '@/lib/utils';
import { getQuestionAttemptStatus } from '@/utils/quiz-attempt-snapshot';

interface GradeQuestionReviewProps {
  answer?: StudentAnswer;
  index: number;
  question: QuestionBlock;
  result?: QuestionResult;
}

const statusStyles = {
  correct: 'border-primary/20 bg-primary/5 text-primary',
  incorrect: 'border-destructive/20 bg-destructive/5 text-destructive',
  pending: 'border-border bg-muted/60 text-foreground',
  unanswered: 'border-border bg-muted/40 text-muted-foreground',
};

export function GradeQuestionReview({
  answer,
  index,
  question,
  result,
}: GradeQuestionReviewProps) {
  const t = useTranslations('Courses.Grades');
  const status = getQuestionAttemptStatus(answer, result);
  const Icon =
    status === 'correct'
      ? CheckCircle2
      : status === 'incorrect'
        ? XCircle
        : status === 'pending'
          ? Clock3
          : CircleDashed;

  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <header className="flex items-center justify-between gap-3 border-b bg-muted/20 px-4 py-3 sm:px-5">
        <h3 className="font-semibold text-sm">
          {t('questionNumber', { number: index + 1 })}
        </h3>
        <Badge
          variant="outline"
          className={cn('gap-1.5', statusStyles[status])}
        >
          <Icon className="size-3.5" aria-hidden="true" />
          {t(`status.${status}`)}
        </Badge>
      </header>
      <div className="space-y-4 p-4 sm:p-5">
        {status === 'unanswered' ? (
          <p className="rounded-lg border border-dashed bg-muted/30 px-4 py-3 text-muted-foreground text-sm">
            {t('unansweredDescription')}
          </p>
        ) : null}
        <ReviewQuestionRenderer question={question} answer={answer} />
      </div>
    </section>
  );
}
