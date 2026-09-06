'use client';

import { ArrowLeft, ArrowRight, Loader2, Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { DeliveryMode } from '@/lib/quiz-template';
import type {
  ClientQuizContent,
  QuizContent,
  ScoreResult,
  StudentAnswer,
} from '@/lib/quiz-template/types';
import { useInstantFeedback } from './hooks/use-instant-feedback';
import { useQuizNavigation } from './hooks/use-quiz-navigation';
import { useQuizReducer } from './hooks/use-quiz-reducer';
import { useQuizSubmission } from './hooks/use-quiz-submission';
import {
  QuizCard,
  QuizCardContent,
  QuizCardFooter,
  QuizCardHeader,
} from './quiz-card';
import { QuizErrorBoundary } from './quiz-error-boundary';
import { QuizIntro } from './quiz-intro';
import { QuizProgress } from './quiz-progress';
import { QuestionRenderer } from './quiz-question-renderer';
import { QuizResult } from './quiz-result';

interface QuizProps {
  quiz: ClientQuizContent | QuizContent;
  quizId?: string;
  submitUrl?: string;
  quizWithAnswers?: QuizContent;
  deliveryMode?: DeliveryMode;
  instantFeedbackUrl?: string;
  onStart?: () => void;
  onComplete?: (result: ScoreResult) => void;
  className?: string;
}

export function Quiz({
  quiz,
  quizId,
  submitUrl,
  quizWithAnswers,
  deliveryMode = 'POST_QUIZ_REVIEW',
  instantFeedbackUrl,
  onStart,
  onComplete,
  className,
}: QuizProps) {
  const t = useTranslations('Quiz');
  const [state, dispatch] = useQuizReducer();
  const totalQuestions = quiz.questions.length;
  const { currentIndex, next, previous, isFirst, isLast } =
    useQuizNavigation(totalQuestions);

  const questionsForScoring =
    quizWithAnswers?.questions ?? (quiz as QuizContent).questions;
  const isInstantMode = deliveryMode === 'INSTANT_FEEDBACK';

  const { submit, isSubmitting } = useQuizSubmission({
    quizId,
    submitUrl,
    quizType: quiz.type,
    questionsForScoring,
    onSuccess: (scoreResult, reviewQs) => {
      dispatch({
        type: 'SUBMIT_SUCCESS',
        result: scoreResult,
        reviewQuestions: reviewQs,
      });
      onComplete?.(scoreResult);
    },
    errorMessage: t('submitError'),
  });

  const {
    checkAnswer,
    isRevealed: answerRevealed,
    instantReviewQuestions,
    setRevealed,
    resetRevealed,
    reset: resetInstantFeedback,
  } = useInstantFeedback({
    instantFeedbackUrl,
    quizType: quiz.type,
    questionsForScoring,
  });

  const currentQuestion = quiz.questions[currentIndex];
  const currentQuestionForDisplay =
    (isInstantMode && instantReviewQuestions.get(currentIndex)) ||
    currentQuestion;
  const currentAnswer = state.answers.get(currentIndex);

  const handleStart = useCallback(() => {
    onStart?.();
    dispatch({ type: 'START' });
  }, [dispatch, onStart]);

  const handleAnswer = useCallback(
    (answer: StudentAnswer) => {
      if (answerRevealed) return;
      dispatch({ type: 'ANSWER', index: currentIndex, answer });
    },
    [dispatch, currentIndex, answerRevealed]
  );

  const handleCheckAnswer = useCallback(async () => {
    if (!currentAnswer) return;
    await checkAnswer(currentIndex, currentAnswer);
  }, [checkAnswer, currentIndex, currentAnswer]);

  const handleNext = useCallback(() => {
    if (isLast) return;
    next();
    setRevealed(false);
  }, [next, isLast, setRevealed]);

  const handlePrevious = useCallback(() => {
    previous();
    resetRevealed(currentIndex - 1);
  }, [previous, resetRevealed, currentIndex]);

  const handleSubmit = useCallback(async () => {
    dispatch({ type: 'SUBMIT_START' });
    await submit(state.answers);
  }, [dispatch, submit, state.answers]);

  const handleRetry = useCallback(() => {
    dispatch({ type: 'RETRY' });
    resetInstantFeedback();
  }, [dispatch, resetInstantFeedback]);

  // ─── Idle State ────────────────────────────────────────────────────────────

  if (state.phase === 'idle') {
    return (
      <QuizIntro quiz={quiz} onStart={handleStart} className={className} />
    );
  }

  // ─── Completed State ───────────────────────────────────────────────────────

  if (state.phase === 'completed' && state.result) {
    const quizForReview = state.reviewQuestions
      ? { ...quiz, questions: state.reviewQuestions }
      : quiz;

    return (
      <QuizResult
        result={state.result}
        quiz={quizForReview as QuizContent}
        answers={state.answers}
        onRetry={handleRetry}
      />
    );
  }

  // ─── In-Progress State ─────────────────────────────────────────────────────

  const currentProgressLabel = `${currentIndex + 1}/${totalQuestions}`;

  return (
    <QuizErrorBoundary>
      <QuizCard className={className}>
        <QuizCardHeader>
          <QuizProgress
            current={currentIndex + 1}
            total={totalQuestions}
            showLabel={false}
          />
          <Badge variant="outline" className="ml-2 text-xs">
            {currentProgressLabel}
          </Badge>
        </QuizCardHeader>

        <QuizCardContent className="min-h-50">
          {currentQuestionForDisplay && (
            <QuestionRenderer
              question={currentQuestionForDisplay}
              answer={currentAnswer}
              onAnswer={handleAnswer}
              showResult={answerRevealed}
              disabled={answerRevealed}
            />
          )}
        </QuizCardContent>

        <QuizCardFooter>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handlePrevious}
            disabled={isFirst || isSubmitting}
          >
            <ArrowLeft className="size-3.5" />
            {t('previous')}
          </Button>

          <div className="flex gap-2">
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

            {(!isInstantMode || answerRevealed) &&
              (isLast ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSubmit}
                  disabled={
                    (!isInstantMode && state.answers.size < totalQuestions) ||
                    isSubmitting
                  }
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
    </QuizErrorBoundary>
  );
}
