'use client';

import { CheckCircle2, RotateCcw, Trophy, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { QuizContent, ScoreResult } from '@/lib/quiz-template';
import { cn } from '@/lib/utils';
import {
  QuizCard,
  QuizCardContent,
  QuizCardFooter,
  QuizCardHeader,
} from './quiz-card';

interface QuizResultProps {
  result: ScoreResult;
  quiz: QuizContent;
  onRetry?: () => void;
}

export function QuizResult({ result, quiz, onRetry }: QuizResultProps) {
  const t = useTranslations('Quiz');

  const getGrade = (percentage: number) => {
    if (percentage >= 90)
      return { label: t('gradeExcellent'), color: 'text-green-600' };
    if (percentage >= 70)
      return { label: t('gradeGood'), color: 'text-blue-600' };
    if (percentage >= 50)
      return { label: t('gradeFair'), color: 'text-yellow-600' };
    return { label: t('gradeNeedsWork'), color: 'text-red-600' };
  };

  const grade = getGrade(result.percentage);
  const correctCount = result.questionResults.filter((r) => r.isCorrect).length;
  const totalCount = result.questionResults.length;

  return (
    <QuizCard>
      <QuizCardHeader>
        <div className="flex items-center gap-2">
          <Trophy className="size-5 text-primary" />
          <span className="font-semibold text-sm">{t('quizComplete')}</span>
        </div>
        <Badge variant="secondary">{quiz.title}</Badge>
      </QuizCardHeader>

      <QuizCardContent className="space-y-5">
        {/* Score display */}
        <div className="flex flex-col items-center gap-2 py-4">
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-4xl text-foreground">
              {Math.round(result.percentage)}
            </span>
            <span className="font-medium text-lg text-muted-foreground">%</span>
          </div>
          <p className={cn('font-semibold text-sm', grade.color)}>
            {grade.label}
          </p>
          <p className="text-muted-foreground text-sm">
            {t('scoreDetail', { correct: correctCount, total: totalCount })}
          </p>
        </div>

        {/* Question breakdown */}
        <div className="space-y-2">
          <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
            {t('questionBreakdown')}
          </p>
          <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
            {result.questionResults.map((qr) => (
              <div
                key={qr.questionIndex}
                className={cn(
                  'flex size-8 items-center justify-center rounded-md font-medium text-xs',
                  qr.isCorrect
                    ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                )}
              >
                {qr.isCorrect ? (
                  <CheckCircle2 className="size-4" />
                ) : (
                  <XCircle className="size-4" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Points */}
        <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
          <span className="text-muted-foreground text-sm">
            {t('pointsEarned')}
          </span>
          <span className="font-semibold text-sm">
            {result.earnedPoints} / {result.totalPoints}
          </span>
        </div>
      </QuizCardContent>

      {onRetry && (
        <QuizCardFooter>
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            <RotateCcw className="size-3.5" />
            {t('retryQuiz')}
          </Button>
        </QuizCardFooter>
      )}
    </QuizCard>
  );
}
