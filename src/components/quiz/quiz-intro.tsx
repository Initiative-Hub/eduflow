'use client';

import { ArrowRight, BookOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ClientQuizContent, QuizContent } from '@/lib/quiz-template/types';
import {
  QuizCard,
  QuizCardContent,
  QuizCardFooter,
  QuizCardHeader,
} from './quiz-card';

interface QuizIntroProps {
  quiz: ClientQuizContent | QuizContent;
  onStart: () => void;
  className?: string;
}

export function QuizIntro({ quiz, onStart, className }: QuizIntroProps) {
  const t = useTranslations('Quiz');
  const totalQuestions = quiz.questions.length;

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
        <h3 className="font-semibold text-foreground text-lg">{quiz.title}</h3>
        <p className="text-muted-foreground text-sm">{quiz.description}</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{t(`type.${quiz.type}`)}</Badge>
        </div>
      </QuizCardContent>

      <QuizCardFooter>
        <span className="text-muted-foreground text-xs">{t('quizMode')}</span>
        <Button type="button" size="sm" onClick={onStart}>
          {t('startQuiz')}
          <ArrowRight className="size-3.5" />
        </Button>
      </QuizCardFooter>
    </QuizCard>
  );
}
