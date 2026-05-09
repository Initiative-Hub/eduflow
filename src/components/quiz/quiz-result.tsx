'use client';

import { CheckCircle2, RotateCcw, Trophy, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type {
  QuizContent,
  ScoreResult,
  StudentAnswers,
} from '@/lib/quiz-template';
import { cn } from '@/lib/utils';
import {
  DragAndDrop,
  Essay,
  FillInTheBlank,
  Matching,
  MultipleChoice,
  Ordering,
  TrueFalse,
} from './questions';
import {
  QuizCard,
  QuizCardContent,
  QuizCardFooter,
  QuizCardHeader,
} from './quiz-card';

interface QuizResultProps {
  result: ScoreResult;
  quiz: QuizContent;
  answers: StudentAnswers;
  onRetry?: () => void;
}

export function QuizResult({
  result,
  quiz,
  answers,
  onRetry,
}: QuizResultProps) {
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

  // Calculate stroke for the circular progress
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (result.percentage / 100) * circumference;

  const getCircleColor = (percentage: number) => {
    if (percentage >= 70) return 'stroke-green-500';
    if (percentage >= 50) return 'stroke-yellow-500';
    return 'stroke-red-500';
  };

  return (
    <div className="space-y-4">
      <QuizCard>
        <QuizCardHeader>
          <div className="flex items-center gap-2">
            <Trophy className="size-5 text-primary" />
            <span className="font-semibold text-sm">{t('quizComplete')}</span>
          </div>
          <Badge variant="secondary">{quiz.title}</Badge>
        </QuizCardHeader>

        <QuizCardContent className="space-y-5">
          {/* Score display — circle + stats side by side */}
          <div className="flex items-center justify-center gap-8 py-4">
            {/* Percentage circle */}
            <div className="relative flex size-32 items-center justify-center">
              <svg className="-rotate-90" viewBox="0 0 120 120">
                <title>{`${Math.round(result.percentage)}%`}</title>
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="10"
                  className="text-muted/30"
                />
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className={cn(
                    'transition-all duration-700',
                    getCircleColor(result.percentage)
                  )}
                />
              </svg>
              <span className="absolute font-bold text-2xl text-foreground">
                {Math.round(result.percentage)}%
              </span>
            </div>

            {/* Points and correct count */}
            <div className="flex flex-col gap-1">
              <p className={cn('font-semibold text-sm', grade.color)}>
                {grade.label}
              </p>
              <p className="text-muted-foreground text-sm">
                {t('scoreDetail', { correct: correctCount, total: totalCount })}
                : {result.earnedPoints}/{result.totalPoints}
              </p>
            </div>
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

      {/* Review all questions with answers */}
      <div className="space-y-4">
        {quiz.questions.map((question, index) => {
          const answer = answers.get(index);
          const qr = result.questionResults[index];

          return (
            <QuizCard key={index}>
              <QuizCardHeader>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-muted-foreground text-sm">
                    {t('questionLabel', { number: index + 1 })}
                  </span>
                </div>
                <div
                  className={cn(
                    'flex size-6 items-center justify-center rounded-full',
                    qr?.isCorrect
                      ? 'bg-green-100 dark:bg-green-950/30'
                      : 'bg-red-100 dark:bg-red-950/30'
                  )}
                >
                  {qr?.isCorrect ? (
                    <CheckCircle2 className="size-4 text-green-600" />
                  ) : (
                    <XCircle className="size-4 text-red-600" />
                  )}
                </div>
              </QuizCardHeader>
              <QuizCardContent>
                <ReviewQuestionRenderer question={question} answer={answer} />
              </QuizCardContent>
            </QuizCard>
          );
        })}
      </div>
    </div>
  );
}

// ─── Review Question Renderer (read-only, shows results) ─────────────────────

interface ReviewQuestionRendererProps {
  question: QuizContent['questions'][number];
  answer?: import('@/lib/quiz-template/types').StudentAnswer;
}

function ReviewQuestionRenderer({
  question,
  answer,
}: ReviewQuestionRendererProps) {
  const noop = () => {};

  switch (question.type) {
    case 'multiple-choice':
      return (
        <MultipleChoice
          question={question}
          selectedOptionId={
            answer?.type === 'multiple-choice'
              ? answer.selectedOptionId
              : undefined
          }
          onSelect={noop}
          showResult={true}
        />
      );

    case 'true-false':
      return (
        <TrueFalse
          question={question}
          selectedAnswer={
            answer?.type === 'true-false' ? answer.selectedAnswer : undefined
          }
          onSelect={noop}
          showResult={true}
        />
      );

    case 'fill-in-the-blank':
      return (
        <FillInTheBlank
          question={question}
          filledBlanks={
            answer?.type === 'fill-in-the-blank' ? answer.filledBlanks : {}
          }
          onFill={noop}
          showResult={true}
        />
      );

    case 'matching':
      return (
        <Matching
          question={question}
          pairs={answer?.type === 'matching' ? answer.pairs : []}
          onMatch={noop}
          showResult={true}
          disabled={true}
        />
      );

    case 'ordering':
      return (
        <Ordering
          question={question}
          orderedItemIds={
            answer?.type === 'ordering'
              ? answer.orderedItemIds
              : question.items.map((item) => item.id)
          }
          onReorder={noop}
          showResult={true}
          disabled={true}
        />
      );

    case 'essay':
      return (
        <Essay
          question={question}
          text={answer?.type === 'essay' ? answer.text : ''}
          onTextChange={noop}
          showResult={true}
          disabled={true}
        />
      );

    case 'drag-and-drop':
      return (
        <DragAndDrop
          question={question}
          placements={answer?.type === 'drag-and-drop' ? answer.placements : {}}
          onPlace={noop}
          showResult={true}
          disabled={true}
        />
      );

    case 'timed-challenge':
      return (
        <ReviewQuestionRenderer
          question={question.innerQuestion}
          answer={answer}
        />
      );

    default:
      return null;
  }
}
