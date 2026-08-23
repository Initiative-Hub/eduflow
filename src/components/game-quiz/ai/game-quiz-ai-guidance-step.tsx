'use client';

import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { GameQuizCopy } from '../copy';

interface GameQuizAiGuidanceStepProps {
  copy: GameQuizCopy;
  questionCount: number;
  maxQuestionCount: number;
  additionalPrompt: string;
  generationError?: string;
  onQuestionCountChange: (count: number) => void;
  onAdditionalPromptChange: (prompt: string) => void;
}

export function GameQuizAiGuidanceStep({
  copy,
  questionCount,
  maxQuestionCount,
  additionalPrompt,
  generationError,
  onQuestionCountChange,
  onAdditionalPromptChange,
}: GameQuizAiGuidanceStepProps) {
  const countOptions = Array.from(
    { length: maxQuestionCount },
    (_, index) => index + 1
  );

  return (
    <FieldGroup>
      {generationError ? (
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>{copy.aiGenerate.generationErrorTitle}</AlertTitle>
          <AlertDescription>{generationError}</AlertDescription>
        </Alert>
      ) : null}

      <Field>
        <FieldLabel htmlFor="game-quiz-ai-question-count">
          {copy.aiGenerate.questionCountLabel}
        </FieldLabel>
        <Select
          value={String(questionCount)}
          onValueChange={(value) =>
            onQuestionCountChange(Number.parseInt(value, 10))
          }
        >
          <SelectTrigger id="game-quiz-ai-question-count" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {countOptions.map((count) => (
                <SelectItem key={count} value={String(count)}>
                  {count}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <FieldDescription>
          {copy.aiGenerate.questionCountDescription} {maxQuestionCount}.
        </FieldDescription>
      </Field>

      <Field>
        <div className="flex items-center justify-between gap-3">
          <FieldLabel htmlFor="game-quiz-ai-additional-prompt">
            {copy.aiGenerate.additionalPromptLabel}
          </FieldLabel>
          <span className="text-muted-foreground text-xs">
            {additionalPrompt.length}/500
          </span>
        </div>
        <Textarea
          id="game-quiz-ai-additional-prompt"
          maxLength={500}
          onChange={(event) => onAdditionalPromptChange(event.target.value)}
          placeholder={copy.aiGenerate.additionalPromptPlaceholder}
          rows={5}
          value={additionalPrompt}
        />
        <FieldDescription>
          {copy.aiGenerate.additionalPromptDescription}
        </FieldDescription>
      </Field>
    </FieldGroup>
  );
}
