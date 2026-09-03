'use client';

import { ChevronLeft, ChevronRight, Copy, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { GameQuizCopy } from '../copy';
import type { GameQuizQuestion } from '../types';
import { GameQuizAnswerOptionCard } from './game-quiz-answer-option-card';
import { GameQuizQuestionExtraDetails } from './game-quiz-question-extra-details';
import { GameQuizTimerPointsBar } from './game-quiz-timer-points-bar';

interface GameQuizQuestionCanvasProps {
  activeIndex: number;
  copy: GameQuizCopy;
  onAddOption: () => void;
  onDuplicateQuestion: () => void;
  canDuplicateQuestion?: boolean;
  onMarkCorrect: (optionIndex: number) => void;
  onNextQuestion: () => void;
  onPrevQuestion: () => void;
  onRemoveOption: (optionIndex: number) => void;
  onRemoveQuestion: () => void;
  onUpdateOption: (optionIndex: number, text: string) => void;
  onUpdateQuestion: (
    key: keyof Omit<GameQuizQuestion, 'id' | 'options' | 'order'>,
    value: string | number
  ) => void;
  question: GameQuizQuestion;
  totalQuestions: number;
}

export function GameQuizQuestionCanvas({
  activeIndex,
  copy,
  onAddOption,
  onDuplicateQuestion,
  canDuplicateQuestion = true,
  onMarkCorrect,
  onNextQuestion,
  onPrevQuestion,
  onRemoveOption,
  onRemoveQuestion,
  onUpdateOption,
  onUpdateQuestion,
  question,
  totalQuestions,
}: GameQuizQuestionCanvasProps) {
  return (
    <section className="space-y-6 rounded-2xl border bg-card p-4 shadow-xs sm:p-6">
      {/* Question Header & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-xl bg-primary font-black text-primary-foreground text-sm shadow-xs">
            {activeIndex + 1}
          </span>
          <div>
            <h2 className="font-bold text-base text-foreground">
              {copy.editor.question} {activeIndex + 1}
            </h2>
            <p className="text-muted-foreground text-xs">
              {activeIndex + 1} of {totalQuestions}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            disabled={!canDuplicateQuestion}
            variant="ghost"
            size="sm"
            onClick={onDuplicateQuestion}
            className="text-muted-foreground hover:text-foreground"
          >
            <Copy className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">
              {copy.editor.duplicateQuestion}
            </span>
          </Button>
          <Button
            type="button"
            disabled={totalQuestions === 1}
            onClick={onRemoveQuestion}
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">
              {copy.editor.removeQuestion}
            </span>
          </Button>
        </div>
      </div>

      {/* Question Prompt Input */}
      <div className="space-y-2">
        <Label
          htmlFor="game-question-prompt"
          className="flex items-center gap-1.5 font-bold text-muted-foreground text-xs uppercase tracking-wider"
        >
          {copy.editor.prompt}
        </Label>
        <Textarea
          id="game-question-prompt"
          onChange={(event) => onUpdateQuestion('prompt', event.target.value)}
          placeholder={`${copy.editor.prompt}...`}
          rows={3}
          value={question.prompt}
          className="resize-none rounded-xl bg-muted/10 p-3.5 font-medium text-base transition-all focus-visible:bg-background focus-visible:ring-primary/40"
        />
      </div>

      {/* Answer Options Section */}
      <fieldset className="space-y-3">
        <div className="flex items-center justify-between">
          <Label
            asChild
            className="font-bold text-muted-foreground text-xs uppercase tracking-wider"
          >
            <legend>{copy.editor.answer} (2–4)</legend>
          </Label>
          <span className="text-muted-foreground text-xs">
            {copy.editor.validation}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {question.options.map((option, optionIndex) => (
            <GameQuizAnswerOptionCard
              key={option.id}
              copy={copy}
              isCorrect={option.isCorrect}
              onMarkCorrect={() => onMarkCorrect(optionIndex)}
              onRemove={() => onRemoveOption(optionIndex)}
              onTextChange={(text) => onUpdateOption(optionIndex, text)}
              option={option}
              optionIndex={optionIndex}
              questionId={question.id}
              totalOptions={question.options.length}
            />
          ))}
        </div>

        {question.options.length < 4 ? (
          <Button
            type="button"
            onClick={onAddOption}
            size="sm"
            variant="outline"
            className="w-full rounded-xl border-dashed py-4 font-semibold text-xs hover:border-primary hover:text-primary"
          >
            <Plus className="size-4" aria-hidden="true" />
            {copy.editor.addAnswer}
          </Button>
        ) : null}
      </fieldset>

      {/* Timer and Points Settings Bar */}
      <GameQuizTimerPointsBar
        copy={copy}
        maxPoints={question.maxPoints}
        onMaxPointsChange={(points) => onUpdateQuestion('maxPoints', points)}
        onTimeLimitChange={(seconds) =>
          onUpdateQuestion('timeLimitSeconds', seconds)
        }
        timeLimitSeconds={question.timeLimitSeconds}
      />

      {/* Extra Details (Hint & Explanation) */}
      <GameQuizQuestionExtraDetails
        copy={copy}
        explanation={question.explanation ?? ''}
        hint={question.hint ?? ''}
        onExplanationChange={(value) => onUpdateQuestion('explanation', value)}
        onHintChange={(value) => onUpdateQuestion('hint', value)}
      />

      {/* Bottom Canvas Footer Navigation */}
      <div className="flex items-center justify-between border-t pt-4">
        <Button
          type="button"
          disabled={activeIndex === 0}
          onClick={onPrevQuestion}
          variant="outline"
          className="rounded-xl"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          {copy.common.back}
        </Button>

        <div className="font-semibold text-muted-foreground text-xs tabular-nums">
          {activeIndex + 1} / {totalQuestions}
        </div>

        <Button
          type="button"
          disabled={activeIndex === totalQuestions - 1}
          onClick={onNextQuestion}
          variant="outline"
          className="rounded-xl"
        >
          {copy.preview.next}
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
}
