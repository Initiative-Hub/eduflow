import { Check, Clock3, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GameQuizCopy } from '../copy';
import type { GameQuizQuestion } from '../types';

export type GameQuizPreviewDevice = 'host' | 'participant';

const OPTION_STYLES = [
  'bg-red-500 text-white',
  'bg-blue-600 text-white',
  'bg-amber-500 text-white',
  'bg-green-600 text-white',
] as const;

const OPTION_SHAPES = [
  <svg
    key="triangle"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="size-5"
    aria-hidden="true"
  >
    <polygon points="12,3 22,21 2,21" />
  </svg>,
  <svg
    key="diamond"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="size-5"
    aria-hidden="true"
  >
    <polygon points="12,2 22,12 12,22 2,12" />
  </svg>,
  <svg
    key="circle"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="size-5"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
  </svg>,
  <svg
    key="square"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="size-5"
    aria-hidden="true"
  >
    <rect x="2" y="2" width="20" height="20" />
  </svg>,
] as const;

function HostQuestionPreview({
  copy,
  question,
  questionIndex,
  revealed,
  totalQuestions,
}: Omit<GameQuizPreviewQuestionStageProps, 'device' | 'onSelectOption'>) {
  return (
    <section
      aria-label={copy.preview.host}
      className="overflow-hidden rounded-2xl border bg-background shadow-lg"
    >
      <div className="flex min-h-150 flex-col justify-between gap-8 bg-muted/30 p-5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="rounded-full border bg-background px-3 py-1.5 font-medium shadow-xs">
            {copy.preview.question} {questionIndex + 1}/{totalQuestions}
          </span>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 shadow-xs">
              <Clock3 className="size-4" aria-hidden="true" />
              {question.timeLimitSeconds} {copy.editor.seconds}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 shadow-xs">
              <Trophy className="size-4" aria-hidden="true" />
              {question.maxPoints} {copy.preview.points}
            </span>
          </div>
        </div>

        <div className="mx-auto w-full max-w-4xl rounded-2xl border bg-background px-6 py-7 text-center shadow-sm sm:px-10 sm:py-10">
          <h2 className="font-extrabold text-2xl leading-tight sm:text-4xl">
            {question.prompt}
          </h2>
          {question.hint ? (
            <p className="mt-4 text-muted-foreground text-sm">
              {copy.player.hint}: {question.hint}
            </p>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {question.options.map((option, optionIndex) => {
            const style = OPTION_STYLES[optionIndex] ?? OPTION_STYLES[0];
            const shape = OPTION_SHAPES[optionIndex] ?? OPTION_SHAPES[0];

            return (
              <div
                className={cn(
                  'flex min-h-20 items-center gap-3 rounded-xl px-4 py-3 font-bold shadow-md',
                  style,
                  revealed && option.isCorrect && 'ring-4 ring-white',
                  revealed && !option.isCorrect && 'opacity-45'
                )}
                key={option.id}
              >
                <span className="grid size-8 shrink-0 place-items-center">
                  {shape}
                </span>
                <span>{option.text}</span>
                {revealed && option.isCorrect ? (
                  <Check className="ml-auto size-5" aria-hidden="true" />
                ) : null}
              </div>
            );
          })}
        </div>

        {revealed && question.explanation ? (
          <p className="rounded-xl border bg-background px-4 py-3 text-sm shadow-xs">
            <span className="font-medium">{copy.editor.explanation}: </span>
            {question.explanation}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function ParticipantQuestionPreview({
  copy,
  onSelectOption,
  question,
  questionIndex,
  revealed,
  selectedOptionId,
  totalQuestions,
}: Omit<GameQuizPreviewQuestionStageProps, 'device'>) {
  return (
    <section
      aria-label={copy.preview.participant}
      className="mx-auto max-w-md overflow-hidden rounded-[2rem] border-[6px] border-foreground/80 bg-background shadow-2xl"
    >
      <div className="flex items-center justify-between bg-primary px-5 py-4 text-primary-foreground text-sm">
        <span className="font-medium">
          {copy.preview.question} {questionIndex + 1}/{totalQuestions}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock3 className="size-4" aria-hidden="true" />
          {question.timeLimitSeconds}s
        </span>
      </div>
      <div className="flex min-h-137.5 flex-col p-5 sm:p-6">
        <h2 className="font-bold text-2xl leading-tight">{question.prompt}</h2>
        <div className="mt-7 grid gap-3">
          {question.options.map((option, optionIndex) => {
            const style = OPTION_STYLES[optionIndex] ?? OPTION_STYLES[0];
            const shape = OPTION_SHAPES[optionIndex] ?? OPTION_SHAPES[0];
            const selected = selectedOptionId === option.id;

            return (
              <button
                aria-pressed={selected}
                className={cn(
                  'flex min-h-16 items-center gap-3 rounded-xl p-4 text-left font-bold transition-[transform,box-shadow,opacity] focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
                  style,
                  selected && !revealed && 'scale-[1.02] shadow-lg',
                  !selected && !revealed && 'opacity-90 hover:opacity-100',
                  revealed && option.isCorrect && 'ring-4 ring-white',
                  revealed && !option.isCorrect && 'opacity-45'
                )}
                disabled={revealed}
                key={option.id}
                onClick={() => onSelectOption(option.id)}
                type="button"
              >
                <span className="grid size-7 shrink-0 place-items-center">
                  {shape}
                </span>
                {option.text}
                {revealed && option.isCorrect ? (
                  <Check className="ml-auto size-5" aria-hidden="true" />
                ) : null}
              </button>
            );
          })}
        </div>
        <div className="mt-auto pt-6">
          {selectedOptionId && !revealed ? (
            <p className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-primary text-sm">
              {copy.preview.answerSelected}
            </p>
          ) : null}
          {revealed && question.explanation ? (
            <p className="rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-sm">
              {question.explanation}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

interface GameQuizPreviewQuestionStageProps {
  copy: GameQuizCopy;
  device: GameQuizPreviewDevice;
  onSelectOption: (optionId: string) => void;
  question: GameQuizQuestion;
  questionIndex: number;
  revealed: boolean;
  selectedOptionId?: string;
  totalQuestions: number;
}

export function GameQuizPreviewQuestionStage(
  props: GameQuizPreviewQuestionStageProps
) {
  return props.device === 'host' ? (
    <HostQuestionPreview {...props} />
  ) : (
    <ParticipantQuestionPreview {...props} />
  );
}
