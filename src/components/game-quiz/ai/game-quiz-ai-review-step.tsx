'use client';

import { Check, Clock3, Lightbulb, LockKeyhole, Trophy } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { GameQuizCopy } from '../copy';
import type { GeneratedGameQuizQuestion } from '../types';

interface GameQuizAiReviewStepProps {
  copy: GameQuizCopy;
  question: GeneratedGameQuizQuestion | undefined;
  currentIndex: number;
  totalQuestions: number;
}

export function GameQuizAiReviewStep({
  copy,
  question,
  currentIndex,
  totalQuestions,
}: GameQuizAiReviewStepProps) {
  if (!question) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Lightbulb aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>{copy.aiGenerate.generationErrorTitle}</EmptyTitle>
          <EmptyDescription>
            {copy.aiGenerate.generationErrorDescription}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ScrollArea className="h-80 rounded-xl border p-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant="secondary">
            {copy.editor.question} {currentIndex + 1} / {totalQuestions}
          </Badge>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              <Clock3 data-icon="inline-start" aria-hidden="true" />
              {question.timerSeconds} {copy.editor.seconds}
            </Badge>
            <Badge variant="outline">
              <Trophy data-icon="inline-start" aria-hidden="true" />
              {question.maxPoints} {copy.preview.points}
            </Badge>
          </div>
        </div>

        <Alert>
          <LockKeyhole aria-hidden="true" />
          <AlertDescription>
            {copy.aiGenerate.reviewDescription}
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{question.prompt}</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              {question.options.map((option, index) => (
                <Field key={`${index}-${option.text}`}>
                  <div
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5',
                      option.isCorrect && 'border-primary/40 bg-primary/5'
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Badge variant={option.isCorrect ? 'default' : 'outline'}>
                        {String.fromCharCode(65 + index)}
                      </Badge>
                      <span className="text-sm">{option.text}</span>
                    </div>
                    {option.isCorrect ? (
                      <Badge variant="secondary">
                        <Check data-icon="inline-start" aria-hidden="true" />
                        {copy.aiGenerate.correctAnswer}
                      </Badge>
                    ) : null}
                  </div>
                </Field>
              ))}
            </FieldGroup>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>{copy.editor.hint}</FieldLabel>
            <div className="min-h-20 rounded-lg border bg-muted/30 p-3 text-sm">
              {question.hint}
            </div>
          </Field>
          <Field>
            <FieldLabel>{copy.editor.explanation}</FieldLabel>
            <div className="min-h-20 rounded-lg border bg-muted/30 p-3 text-sm">
              {question.explanation}
            </div>
          </Field>
        </div>
      </div>
    </ScrollArea>
  );
}
