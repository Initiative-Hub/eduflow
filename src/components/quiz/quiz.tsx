'use client';

import { ArrowLeft, ArrowRight, BookOpen, Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
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
  DragAndDrop,
  Essay,
  FillInTheBlank,
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
  const [showResults, setShowResults] = useState(false);
  const [result, setResult] = useState<ScoreResult | null>(null);

  const currentQuestion = quiz.questions[currentIndex];
  const totalQuestions = quiz.questions.length;
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const currentAnswer = answers.get(currentIndex);

  const handleStart = () => {
    setState('in-progress');
    setCurrentIndex(0);
    setAnswers(new Map());
    setShowResults(false);
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
    if (isLastQuestion) {
      return;
    }
    setCurrentIndex((prev) => prev + 1);
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
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
    setShowResults(true);
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
    return (
      <QuizResult
        result={result}
        quiz={quiz}
        answers={answers}
        onRetry={handleRetry}
      />
    );
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
            showResult={showResults}
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
          {isLastQuestion ? (
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

    case 'essay':
      return (
        <Essay
          question={question}
          text={answer?.type === 'essay' ? answer.text : ''}
          onTextChange={(text) =>
            onAnswer({
              type: 'essay',
              text,
              attachments:
                answer?.type === 'essay' ? answer.attachments : undefined,
              teacherRubricText:
                answer?.type === 'essay' ? answer.teacherRubricText : undefined,
              teacherRubricAttachments:
                answer?.type === 'essay'
                  ? answer.teacherRubricAttachments
                  : undefined,
            })
          }
          onAttachmentsChange={(attachments: string[]) =>
            onAnswer({
              type: 'essay',
              text: answer?.type === 'essay' ? answer.text : '',
              attachments,
              teacherRubricText:
                answer?.type === 'essay' ? answer.teacherRubricText : undefined,
              teacherRubricAttachments:
                answer?.type === 'essay'
                  ? answer.teacherRubricAttachments
                  : undefined,
            })
          }
          onTeacherRubricTextChange={(teacherRubricText: string) =>
            onAnswer({
              type: 'essay',
              text: answer?.type === 'essay' ? answer.text : '',
              attachments:
                answer?.type === 'essay' ? answer.attachments : undefined,
              teacherRubricText,
              teacherRubricAttachments:
                answer?.type === 'essay'
                  ? answer.teacherRubricAttachments
                  : undefined,
            })
          }
          onTeacherRubricAttachmentsChange={(
            teacherRubricAttachments: string[]
          ) =>
            onAnswer({
              type: 'essay',
              text: answer?.type === 'essay' ? answer.text : '',
              attachments:
                answer?.type === 'essay' ? answer.attachments : undefined,
              teacherRubricText:
                answer?.type === 'essay' ? answer.teacherRubricText : undefined,
              teacherRubricAttachments,
            })
          }
          teacherRubricText={
            answer?.type === 'essay' ? (answer.teacherRubricText ?? '') : ''
          }
          showResult={showResult}
          showTeacherRubricInput={question.allowTeacherRubric}
        />
      );

    case 'drag-and-drop':
      return (
        <DragAndDrop
          question={question}
          placements={answer?.type === 'drag-and-drop' ? answer.placements : {}}
          onPlace={(placements) =>
            onAnswer({ type: 'drag-and-drop', placements })
          }
          showResult={showResult}
        />
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
