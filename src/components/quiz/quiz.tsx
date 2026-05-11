'use client';

import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Loader2,
  Send,
  XCircle,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ClientQuizContent } from '@/lib/quiz-template/client-types';
import type {
  QuestionBlock,
  QuizContent,
  ScoreResult,
  StudentAnswer,
  StudentAnswers,
} from '@/lib/quiz-template/types';
import { cn } from '@/lib/utils';
import type { QuizState } from './quiz.types';
import {
  QuizCard,
  QuizCardContent,
  QuizCardFooter,
  QuizCardHeader,
} from './quiz-card';
import { QuizProgress } from './quiz-progress';
import { QuestionRenderer } from './quiz-question-renderer';
import { QuizResult } from './quiz-result';

interface QuizProps {
  /**
   * Quiz content for display. Accepts either:
   * - ClientQuizContent (stripped of answers, for secure student-facing use)
   * - QuizContent (full data, for demo/preview purposes only)
   */
  quiz: ClientQuizContent | QuizContent;
  /**
   * Full quiz content with answer data for server-side scoring.
   * When provided, scoring is done via the server API.
   * When omitted (demo mode), scoring falls back to client-side.
   */
  quizWithAnswers?: QuizContent;
  /**
   * Delivery mode for the quiz. When 'instant-feedback', the answer
   * is revealed after each question before moving to the next.
   */
  deliveryMode?: 'instant-feedback' | 'post-quiz-review';
  onComplete?: (result: ScoreResult) => void;
  className?: string;
}

export function Quiz({
  quiz,
  quizWithAnswers,
  deliveryMode = 'instant-feedback',
  onComplete,
  className,
}: QuizProps) {
  const t = useTranslations('Quiz');
  const [state, setState] = useState<QuizState>('idle');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<StudentAnswers>(new Map());
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [reviewQuestions, setReviewQuestions] = useState<
    QuestionBlock[] | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Instant-feedback state: whether the current question's answer is revealed
  const [answerRevealed, setAnswerRevealed] = useState(false);
  // Track per-question instant result (correct/incorrect)
  const [instantResults, setInstantResults] = useState<
    Map<number, boolean | null>
  >(new Map());

  const currentQuestion = quiz.questions[currentIndex];
  const totalQuestions = quiz.questions.length;
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const currentAnswer = answers.get(currentIndex);
  const isInstantMode = deliveryMode === 'instant-feedback';

  const handleStart = () => {
    setState('in-progress');
    setCurrentIndex(0);
    setAnswers(new Map());
    setResult(null);
    setReviewQuestions(null);
    setAnswerRevealed(false);
    setInstantResults(new Map());
  };

  const handleAnswer = useCallback(
    (answer: StudentAnswer) => {
      if (answerRevealed) return; // Don't allow changes after reveal
      setAnswers((prev) => {
        const next = new Map(prev);
        next.set(currentIndex, answer);
        return next;
      });
    },
    [currentIndex, answerRevealed]
  );

  /** In instant-feedback mode, check the answer and reveal the result */
  const handleCheckAnswer = async () => {
    if (!currentAnswer) return;
    setAnswerRevealed(true);

    // Submit just this question to get the result
    try {
      const questionsForScoring =
        quizWithAnswers?.questions ?? (quiz as QuizContent).questions;
      const singleQuestion = questionsForScoring[currentIndex];

      if (!singleQuestion) return;

      const answersRecord: Record<string, StudentAnswer> = {
        '0': currentAnswer,
      };

      const response = await fetch('/api/v1/quizzes/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          quizType: quiz.type,
          questions: [singleQuestion],
          answers: answersRecord,
          pointsPerQuestion: 10,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const isCorrect = data.questionResults?.[0]?.isCorrect ?? null;
        setInstantResults((prev) => {
          const next = new Map(prev);
          next.set(currentIndex, isCorrect);
          return next;
        });
      }
    } catch {
      // If scoring fails, still allow progression
    }
  };

  const handleNext = () => {
    if (isLastQuestion) return;
    setCurrentIndex((prev) => prev + 1);
    setAnswerRevealed(false);
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
    // In instant mode, if going back to a revealed question, keep it revealed
    setAnswerRevealed(instantResults.has(currentIndex - 1));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Convert Map to a plain object for JSON serialization
      const answersRecord: Record<string, StudentAnswer> = {};
      for (const [index, answer] of answers.entries()) {
        answersRecord[index.toString()] = answer;
      }

      // Determine the source of truth for questions (server data or quiz prop)
      const questionsForScoring =
        quizWithAnswers?.questions ?? (quiz as QuizContent).questions;

      const response = await fetch('/api/v1/quizzes/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          quizType: quiz.type,
          questions: questionsForScoring,
          answers: answersRecord,
          pointsPerQuestion: 10,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to submit quiz');
      }

      const responseData = await response.json();
      const { reviewQuestions: returnedQuestions, ...scoreResult } =
        responseData as ScoreResult & { reviewQuestions?: QuestionBlock[] };

      setResult(scoreResult);
      if (returnedQuestions) {
        setReviewQuestions(returnedQuestions);
      }
      setState('completed');
      onComplete?.(scoreResult);
    } catch (error: any) {
      toast.error(error.message || t('submitError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    handleStart();
  };

  // ─── Idle State ──────────────────────────────────────────────────────────────

  if (state === 'idle') {
    return (
      <QuizCard className={className}>
        <QuizCardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="size-5 text-primary" />
            <span className="font-semibold text-sm">{t('quizTitle')}</span>
          </div>
          <Badge variant="secondary">
            {t('questionCount', { count: totalQuestions })}
          </Badge>
        </QuizCardHeader>

        <QuizCardContent className="space-y-3">
          <h3 className="font-semibold text-foreground text-lg">
            {quiz.title}
          </h3>
          <p className="text-muted-foreground text-sm">{quiz.description}</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{t(`type.${quiz.type}`)}</Badge>
          </div>
        </QuizCardContent>

        <QuizCardFooter>
          <span className="text-muted-foreground text-xs">{t('quizMode')}</span>
          <Button type="button" size="sm" onClick={handleStart}>
            {t('startQuiz')}
            <ArrowRight className="size-3.5" />
          </Button>
        </QuizCardFooter>
      </QuizCard>
    );
  }

  // ─── Completed State ─────────────────────────────────────────────────────────

  if (state === 'completed' && result) {
    // Use reviewQuestions (with answer data) for the result view so
    // correct/incorrect indicators can be displayed
    const quizForReview = reviewQuestions
      ? { ...quiz, questions: reviewQuestions }
      : quiz;

    return (
      <QuizResult
        result={result}
        quiz={quizForReview as QuizContent}
        answers={answers}
        onRetry={handleRetry}
      />
    );
  }

  // ─── In-Progress State ───────────────────────────────────────────────────────

  const currentInstantResult = instantResults.get(currentIndex);

  return (
    <QuizCard className={className}>
      <QuizCardHeader>
        <QuizProgress current={currentIndex + 1} total={totalQuestions} />
      </QuizCardHeader>

      <QuizCardContent className="min-h-50">
        {currentQuestion && (
          <>
            <QuestionRenderer
              question={currentQuestion}
              answer={currentAnswer}
              onAnswer={handleAnswer}
              showResult={answerRevealed}
              disabled={answerRevealed}
            />

            {/* Instant feedback indicator */}
            {isInstantMode &&
              answerRevealed &&
              currentInstantResult !== undefined && (
                <div
                  className={cn(
                    'mt-4 flex items-center gap-2 rounded-lg border p-3 text-sm',
                    currentInstantResult
                      ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/20 dark:text-green-300'
                      : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/20 dark:text-red-300'
                  )}
                >
                  {currentInstantResult ? (
                    <>
                      <CheckCircle2 className="size-4 shrink-0" />
                      <span>{t('correctAnswer')}</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="size-4 shrink-0" />
                      <span>{t('incorrectAnswer')}</span>
                    </>
                  )}
                </div>
              )}
          </>
        )}
      </QuizCardContent>

      <QuizCardFooter>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handlePrevious}
          disabled={currentIndex === 0 || isSubmitting}
        >
          <ArrowLeft className="size-3.5" />
          {t('previous')}
        </Button>

        <div className="flex gap-2">
          {/* In instant mode: show "Check Answer" button before revealing */}
          {isInstantMode && !answerRevealed && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={handleCheckAnswer}
              disabled={!currentAnswer}
            >
              {t('checkAnswer')}
            </Button>
          )}

          {/* After answer is revealed (instant) or always (post-quiz): show Next/Submit */}
          {(!isInstantMode || answerRevealed) &&
            (isLastQuestion ? (
              <Button
                type="button"
                size="sm"
                onClick={handleSubmit}
                disabled={answers.size < totalQuestions || isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Send className="size-3.5" />
                )}
                {isSubmitting ? t('submitting') : t('submitQuiz')}
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={handleNext}>
                {t('next')}
                <ArrowRight className="size-3.5" />
              </Button>
            ))}
        </div>
      </QuizCardFooter>
    </QuizCard>
  );
}
