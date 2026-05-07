'use client';

import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Send,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { calculateScore } from '@/lib/quiz-template/scoring';
import type {
  MatchingPair,
  QuizContent,
  ScoreResult,
  StudentAnswer,
  StudentAnswers,
} from '@/lib/quiz-template/types';
import {
  FillInTheBlank,
  Flashcard,
  Matching,
  MultipleChoice,
  Ordering,
  TrueFalse,
} from './questions';
import type { QuizState } from './quiz.types';
import {
  QuizCard,
  QuizCardContent,
  QuizCardFooter,
  QuizCardHeader,
} from './quiz-card';
import { QuizProgress } from './quiz-progress';
import { QuizResult } from './quiz-result';

interface QuizProps {
  quiz: QuizContent;
  onComplete?: (result: ScoreResult) => void;
  className?: string;
}

export function Quiz({ quiz, onComplete, className }: QuizProps) {
  const t = useTranslations('Quiz');
  const [state, setState] = useState<QuizState>('idle');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<StudentAnswers>(new Map());
  const [showQuestionResult, setShowQuestionResult] = useState(false);
  const [result, setResult] = useState<ScoreResult | null>(null);

  const currentQuestion = quiz.questions[currentIndex];
  const totalQuestions = quiz.questions.length;
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const currentAnswer = answers.get(currentIndex);

  const hasFlashcardsOnly = useMemo(
    () => quiz.questions.every((q) => q.type === 'flashcard'),
    [quiz.questions]
  );

  const handleStart = () => {
    setState('in-progress');
    setCurrentIndex(0);
    setAnswers(new Map());
    setShowQuestionResult(false);
    setResult(null);
  };

  const handleAnswer = useCallback(
    (answer: StudentAnswer) => {
      setAnswers((prev) => {
        const next = new Map(prev);
        next.set(currentIndex, answer);
        return next;
      });
    },
    [currentIndex]
  );

  const handleNext = () => {
    setShowQuestionResult(false);
    if (isLastQuestion) {
      handleSubmit();
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    setShowQuestionResult(false);
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleCheckAnswer = () => {
    setShowQuestionResult(true);
  };

  const handleSubmit = () => {
    const schema = {
      type: quiz.type,
      constraints: { minQuestions: 1, maxQuestions: 100 },
      scoring: { pointsPerQuestion: 10 },
      questions: quiz.questions,
    };
    const scoreResult = calculateScore(answers, schema);
    setResult(scoreResult);
    setState('completed');
    onComplete?.(scoreResult);
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
          <span className="text-muted-foreground text-xs">
            {hasFlashcardsOnly ? t('flashcardMode') : t('quizMode')}
          </span>
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
    return <QuizResult result={result} quiz={quiz} onRetry={handleRetry} />;
  }

  // ─── In-Progress State ───────────────────────────────────────────────────────

  return (
    <QuizCard className={className}>
      <QuizCardHeader>
        <QuizProgress current={currentIndex + 1} total={totalQuestions} />
      </QuizCardHeader>

      <QuizCardContent className="min-h-50">
        {currentQuestion && (
          <QuestionRenderer
            question={currentQuestion}
            answer={currentAnswer}
            onAnswer={handleAnswer}
            showResult={showQuestionResult}
          />
        )}
      </QuizCardContent>

      <QuizCardFooter>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
        >
          <ArrowLeft className="size-3.5" />
          {t('previous')}
        </Button>

        <div className="flex gap-2">
          {!hasFlashcardsOnly && currentAnswer && !showQuestionResult && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCheckAnswer}
            >
              <CheckCircle2 className="size-3.5" />
              {t('checkAnswer')}
            </Button>
          )}

          {isLastQuestion && !hasFlashcardsOnly ? (
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              disabled={answers.size < totalQuestions}
            >
              <Send className="size-3.5" />
              {t('submitQuiz')}
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={handleNext}>
              {t('next')}
              <ArrowRight className="size-3.5" />
            </Button>
          )}
        </div>
      </QuizCardFooter>
    </QuizCard>
  );
}

// ─── Question Renderer ─────────────────────────────────────────────────────────

interface QuestionRendererProps {
  question: QuizContent['questions'][number];
  answer?: StudentAnswer;
  onAnswer: (answer: StudentAnswer) => void;
  showResult: boolean;
}

function QuestionRenderer({
  question,
  answer,
  onAnswer,
  showResult,
}: QuestionRendererProps) {
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
          onSelect={(optionId) =>
            onAnswer({ type: 'multiple-choice', selectedOptionId: optionId })
          }
          showResult={showResult}
        />
      );

    case 'true-false':
      return (
        <TrueFalse
          question={question}
          selectedAnswer={
            answer?.type === 'true-false' ? answer.selectedAnswer : undefined
          }
          onSelect={(value) =>
            onAnswer({ type: 'true-false', selectedAnswer: value })
          }
          showResult={showResult}
        />
      );

    case 'fill-in-the-blank':
      return (
        <FillInTheBlank
          question={question}
          filledBlanks={
            answer?.type === 'fill-in-the-blank' ? answer.filledBlanks : {}
          }
          onFill={(blankId, value) => {
            const current =
              answer?.type === 'fill-in-the-blank' ? answer.filledBlanks : {};
            onAnswer({
              type: 'fill-in-the-blank',
              filledBlanks: { ...current, [blankId]: value },
            });
          }}
          showResult={showResult}
        />
      );

    case 'matching':
      return (
        <Matching
          question={question}
          pairs={answer?.type === 'matching' ? answer.pairs : []}
          onMatch={(pairs: MatchingPair[]) =>
            onAnswer({ type: 'matching', pairs })
          }
          showResult={showResult}
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
          onReorder={(orderedItemIds) =>
            onAnswer({ type: 'ordering', orderedItemIds })
          }
          showResult={showResult}
        />
      );

    case 'flashcard':
      return <Flashcard question={question} />;

    case 'drag-and-drop':
      return (
        <div className="space-y-3">
          <p className="font-medium text-base text-foreground">
            {question.prompt}
          </p>
          <p className="text-muted-foreground text-sm italic">
            Drag-and-drop interaction coming soon.
          </p>
        </div>
      );

    case 'timed-challenge':
      return (
        <QuestionRenderer
          question={question.innerQuestion}
          answer={answer}
          onAnswer={onAnswer}
          showResult={showResult}
        />
      );

    default:
      return null;
  }
}
