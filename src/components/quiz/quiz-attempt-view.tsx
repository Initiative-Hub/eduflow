'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AttemptView } from '@/lib/api/quiz-attempt-client';
import type { StudentAnswer } from '@/lib/quiz-template';
import {
  QuizCard,
  QuizCardContent,
  QuizCardFooter,
  QuizCardHeader,
} from './quiz-card';
import { QuizProgress } from './quiz-progress';
import { QuestionRenderer } from './quiz-question-renderer';

export interface ManagedQuizProps {
  attempt: AttemptView;
  answers: Record<string, StudentAnswer>;
  currentIndex: number;
  disabled: boolean;
  onAnswer: (answer: StudentAnswer) => void;
  onNavigate: (index: number) => void;
  onCheck: () => void;
  onSubmit: () => void;
}

export function QuizAttemptView({
  attempt,
  answers,
  currentIndex,
  disabled,
  onAnswer,
  onNavigate,
  onCheck,
  onSubmit,
}: ManagedQuizProps) {
  const t = useTranslations('Quiz');
  const count = attempt.quiz.questions.length;
  const revealed = attempt.checkedQuestionIndices.includes(currentIndex);
  const canSubmit =
    Object.keys(answers).length === count &&
    (attempt.deliveryMode !== 'INSTANT_FEEDBACK' ||
      attempt.checkedQuestionIndices.length === count);
  const question =
    attempt.reviewQuestions[currentIndex] ??
    attempt.quiz.questions[currentIndex];
  return (
    <QuizCard>
      <QuizCardHeader>
        <QuizProgress
          current={currentIndex + 1}
          total={count}
          showLabel={false}
        />
        <Badge variant="outline">
          {currentIndex + 1}/{count}
        </Badge>
      </QuizCardHeader>
      <QuizCardContent>
        <QuestionRenderer
          key={currentIndex}
          question={question}
          answer={answers[currentIndex]}
          onAnswer={onAnswer}
          showResult={revealed}
          disabled={disabled || revealed}
        />
      </QuizCardContent>
      <QuizCardFooter>
        <Button
          variant="ghost"
          disabled={disabled || currentIndex === 0}
          onClick={() => onNavigate(currentIndex - 1)}
        >
          {t('previous')}
        </Button>
        <div className="flex gap-2">
          {attempt.deliveryMode === 'INSTANT_FEEDBACK' && !revealed && (
            <Button
              variant="secondary"
              disabled={disabled || !answers[currentIndex]}
              onClick={onCheck}
            >
              {t('checkAnswer')}
            </Button>
          )}
          {currentIndex < count - 1 ? (
            <Button
              disabled={disabled}
              onClick={() => onNavigate(currentIndex + 1)}
            >
              {t('next')}
            </Button>
          ) : (
            <Button disabled={disabled || !canSubmit} onClick={onSubmit}>
              {t('submitQuiz')}
            </Button>
          )}
        </div>
      </QuizCardFooter>
    </QuizCard>
  );
}
