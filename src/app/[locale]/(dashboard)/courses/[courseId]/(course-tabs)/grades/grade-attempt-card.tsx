'use client';

import { CalendarDays, ChevronDown, Clock3 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { GradeQuestionReview } from './grade-question-review';
import type { StudentGradeAttempt } from './grades.types';

interface GradeAttemptCardProps {
  attempt: StudentGradeAttempt;
}

export function GradeAttemptCard({ attempt }: GradeAttemptCardProps) {
  const t = useTranslations('Courses.Grades');
  const locale = useLocale();
  const totalQuestions = attempt.quizSnapshot.questions.length;
  const correctCount = attempt.results.filter(
    (result) => result.isCorrect
  ).length;
  const formattedDate = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(attempt.createdAt));

  return (
    <AccordionItem
      value={attempt.id}
      className="overflow-hidden rounded-2xl border bg-card shadow-sm"
    >
      <div className="p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-bold text-lg leading-tight sm:text-xl">
                {attempt.quizSnapshot.title}
              </h2>
              <Badge variant="secondary">
                {t(`deliveryMode.${attempt.quizSnapshot.deliveryMode}`)}
              </Badge>
              {attempt.isLegacySnapshot ? (
                <Badge variant="outline">{t('legacyAttempt')}</Badge>
              ) : null}
            </div>
            <p className="flex items-center gap-2 text-muted-foreground text-sm">
              <CalendarDays className="size-4" aria-hidden="true" />
              {formattedDate}
            </p>
          </div>

          <div className="flex items-baseline gap-2 tabular-nums">
            <span className="font-bold text-3xl tracking-tight">
              {Math.round(attempt.percentage)}%
            </span>
            <span className="text-muted-foreground text-sm">
              {attempt.score}/{attempt.maxScore} {t('points')}
            </span>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-4">
          <GradeMetric
            label={t('points')}
            value={`${attempt.score}/${attempt.maxScore}`}
          />
          <GradeMetric
            label={t('percentage')}
            value={`${Math.round(attempt.percentage)}%`}
          />
          <GradeMetric
            label={t('answered')}
            value={`${attempt.answeredCount}/${totalQuestions}`}
          />
          <GradeMetric
            label={t('correct')}
            value={`${correctCount}/${totalQuestions}`}
          />
        </dl>

        {attempt.hasPendingReview ? (
          <p className="mt-4 flex items-center gap-2 text-muted-foreground text-sm">
            <Clock3 className="size-4" aria-hidden="true" />
            {t('pendingReview')}
          </p>
        ) : null}
      </div>

      <AccordionTrigger className="group min-h-12 border-t bg-muted/20 px-4 py-3 text-sm hover:bg-muted/50 hover:no-underline sm:px-6 [&>svg]:hidden">
        <span>{t('reviewAnswers')}</span>
        <ChevronDown className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </AccordionTrigger>
      <AccordionContent className="border-t bg-muted/10 px-4 pt-4 pb-5 sm:px-6 sm:pt-6 sm:pb-6">
        <div className="space-y-4">
          {attempt.quizSnapshot.questions.map((question, index) => (
            <GradeQuestionReview
              key={`${attempt.id}-${index}`}
              answer={attempt.answers[index.toString()]}
              index={index}
              question={question}
              result={attempt.results[index]}
            />
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function GradeMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card px-4 py-3 sm:px-5">
      <dt className="text-muted-foreground text-xs uppercase tracking-wide">
        {label}
      </dt>
      <dd className="mt-1 font-semibold text-lg tabular-nums">{value}</dd>
    </div>
  );
}
