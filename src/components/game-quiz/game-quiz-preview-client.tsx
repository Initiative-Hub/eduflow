'use client';

import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  MonitorUp,
  RotateCcw,
  Smartphone,
  Trophy,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { gameQuizApi } from './api';
import { type GameQuizCopy, gameQuizCopy } from './copy';

interface GameQuizPreviewClientProps {
  gameQuizId: string;
  copy?: GameQuizCopy;
}

type PreviewDevice = 'host' | 'participant';

const KAHOOT_OPTION_STYLES = [
  {
    bg: 'bg-red-500',
    text: 'text-white',
    correctRing: 'ring-white',
    selectedBorder: 'border-red-500',
    selectedBg: 'bg-red-50 dark:bg-red-950/30',
  },
  {
    bg: 'bg-blue-600',
    text: 'text-white',
    correctRing: 'ring-white',
    selectedBorder: 'border-blue-600',
    selectedBg: 'bg-blue-50 dark:bg-blue-950/30',
  },
  {
    bg: 'bg-amber-500',
    text: 'text-white',
    correctRing: 'ring-white',
    selectedBorder: 'border-amber-500',
    selectedBg: 'bg-amber-50 dark:bg-amber-950/30',
  },
  {
    bg: 'bg-green-600',
    text: 'text-white',
    correctRing: 'ring-white',
    selectedBorder: 'border-green-600',
    selectedBg: 'bg-green-50 dark:bg-green-950/30',
  },
] as const;

const KAHOOT_SHAPES = [
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

export function GameQuizPreviewClient({
  gameQuizId,
  copy = gameQuizCopy,
}: GameQuizPreviewClientProps) {
  const gameQuery = useQuery({
    queryKey: ['game-quiz', gameQuizId],
    queryFn: () => gameQuizApi.get(gameQuizId),
  });
  const [mobileDevice, setMobileDevice] = useState<PreviewDevice>('host');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string>();

  if (gameQuery.isPending) {
    return (
      <div className="flex min-h-72 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
        {copy.common.loading}
      </div>
    );
  }
  if (gameQuery.isError || !gameQuery.data) {
    return <p className="text-destructive">{copy.common.error}</p>;
  }

  const questions = gameQuery.data.questions ?? [];
  const question = questions[questionIndex];
  if (!question) {
    return <p className="text-muted-foreground">{copy.library.noQuestions}</p>;
  }

  const moveToQuestion = (nextIndex: number) => {
    setQuestionIndex(nextIndex);
    setSelectedOptionId(undefined);
    setRevealed(false);
  };
  const resetQuestion = () => {
    setSelectedOptionId(undefined);
    setRevealed(false);
  };

  return (
    <main className="min-h-[calc(100vh-6rem)] bg-foreground px-4 py-5 text-background sm:px-6 lg:px-8 dark:bg-background dark:text-foreground">
      <div className="mx-auto flex max-w-360 flex-col gap-6">
        <header className="flex flex-col gap-4 border-background/20 border-b pb-5 lg:flex-row lg:items-end lg:justify-between dark:border-border">
          <div className="flex items-start gap-3">
            <Button asChild size="icon" variant="ghost">
              <Link
                aria-label={copy.preview.backToEditor}
                href={`/games/${gameQuizId}/edit`}
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <div>
              <p className="text-background/70 text-sm">
                {gameQuery.data.title}
              </p>
              <h1 className="mt-1 font-semibold text-2xl sm:text-3xl">
                {copy.preview.title}
              </h1>
            </div>
          </div>
          <div className="grid grid-cols-2 border border-background/25 p-1 lg:hidden dark:border-border">
            <Button
              aria-pressed={mobileDevice === 'host'}
              onClick={() => setMobileDevice('host')}
              size="sm"
              variant={mobileDevice === 'host' ? 'secondary' : 'ghost'}
            >
              <MonitorUp className="size-4" aria-hidden="true" />
              {copy.preview.host}
            </Button>
            <Button
              aria-pressed={mobileDevice === 'participant'}
              onClick={() => setMobileDevice('participant')}
              size="sm"
              variant={mobileDevice === 'participant' ? 'secondary' : 'ghost'}
            >
              <Smartphone className="size-4" aria-hidden="true" />
              {copy.preview.participant}
            </Button>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.36fr)]">
          <section
            aria-label={copy.preview.host}
            className={`${mobileDevice === 'host' ? 'block' : 'hidden'} lg:block`}
          >
            <div className="mb-3 flex items-center gap-2 font-medium text-lg">
              <MonitorUp className="size-5" aria-hidden="true" />
              {copy.preview.host}
            </div>
            <div className="relative min-h-142.5 overflow-hidden border bg-muted/20 p-5 sm:p-8 dark:border-border dark:bg-card">
              <div className="relative flex min-h-125 flex-col justify-between gap-8">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <span className="border border-background/40 bg-foreground/70 px-3 py-1.5 font-medium dark:border-border dark:bg-card/80">
                    {copy.preview.question} {questionIndex + 1}/
                    {questions.length}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-2 border border-background/40 bg-foreground/70 px-3 py-1.5 dark:border-border dark:bg-card/80">
                      <Clock3 className="size-4" aria-hidden="true" />
                      {question.timeLimitSeconds} {copy.editor.seconds}
                    </span>
                    <span className="inline-flex items-center gap-2 border border-background/40 bg-foreground/70 px-3 py-1.5 dark:border-border dark:bg-card/80">
                      <Trophy className="size-4" aria-hidden="true" />
                      {question.maxPoints} {copy.preview.points}
                    </span>
                  </div>
                </div>

                <div className="mx-auto w-full max-w-4xl bg-background px-5 py-5 text-center text-foreground sm:px-8 sm:py-7">
                  <h2 className="font-semibold text-2xl leading-tight sm:text-4xl">
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
                    const style =
                      KAHOOT_OPTION_STYLES[optionIndex] ??
                      KAHOOT_OPTION_STYLES[0];
                    const shape =
                      KAHOOT_SHAPES[optionIndex] ?? KAHOOT_SHAPES[0];
                    return (
                      <div
                        className={`flex min-h-20 items-center gap-3 px-4 py-3 shadow-lg transition-colors ${style.bg} ${style.text} ${revealed && option.isCorrect ? 'ring-4 ring-white' : ''} ${revealed && !option.isCorrect ? 'opacity-60' : ''}`}
                        key={option.id}
                      >
                        <span className="grid size-8 shrink-0 place-items-center">
                          {shape}
                        </span>
                        <span className="font-bold">{option.text}</span>
                        {revealed && option.isCorrect ? (
                          <Check
                            className="ml-auto size-5"
                            aria-hidden="true"
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                {revealed && question.explanation ? (
                  <p className="border border-background/35 bg-foreground/75 px-4 py-3 text-sm dark:border-border dark:bg-card/90">
                    <span className="font-medium">
                      {copy.editor.explanation}:{' '}
                    </span>
                    {question.explanation}
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          <section
            aria-label={copy.preview.participant}
            className={`${mobileDevice === 'participant' ? 'block' : 'hidden'} lg:block`}
          >
            <div className="mb-3 flex items-center gap-2 font-medium text-lg">
              <Smartphone className="size-5" aria-hidden="true" />
              {copy.preview.participant}
            </div>
            <div className="mx-auto min-h-142.5 max-w-md overflow-hidden border-[6px] border-background/70 bg-background text-foreground shadow-2xl dark:border-border">
              <div className="flex items-center justify-between bg-primary px-5 py-4 text-primary-foreground text-sm">
                <span className="font-medium">
                  {copy.preview.question} {questionIndex + 1}/{questions.length}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="size-4" aria-hidden="true" />
                  {question.timeLimitSeconds}s
                </span>
              </div>
              <div className="flex min-h-122.5 flex-col p-5 sm:p-6">
                <h2 className="font-semibold text-2xl leading-tight">
                  {question.prompt}
                </h2>
                <div className="mt-7 grid gap-3">
                  {question.options.map((option, optionIndex) => {
                    const style =
                      KAHOOT_OPTION_STYLES[optionIndex] ??
                      KAHOOT_OPTION_STYLES[0];
                    const shape =
                      KAHOOT_SHAPES[optionIndex] ?? KAHOOT_SHAPES[0];
                    const selected = selectedOptionId === option.id;
                    const correct = revealed && option.isCorrect;
                    return (
                      <button
                        aria-pressed={selected}
                        className={`flex min-h-16 items-center gap-3 p-4 text-left font-bold transition-all focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 ${correct ? `${style.bg} ${style.text} ring-4 ring-white` : selected ? `${style.bg} ${style.text} scale-[1.02] shadow-lg` : `${style.bg} ${style.text} opacity-90 hover:opacity-100 hover:shadow-md`} ${revealed && !correct ? 'opacity-50' : ''} ${revealed ? 'cursor-default' : ''}`}
                        disabled={revealed}
                        key={option.id}
                        onClick={() => setSelectedOptionId(option.id)}
                        type="button"
                      >
                        <span className="grid size-7 shrink-0 place-items-center">
                          {shape}
                        </span>
                        {option.text}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-auto pt-6">
                  {selectedOptionId && !revealed ? (
                    <p className="border border-primary/30 bg-primary/10 px-3 py-2 text-primary text-sm">
                      {copy.preview.answerSelected}
                    </p>
                  ) : null}
                  {revealed && question.explanation ? (
                    <p className="border border-success/30 bg-success/10 px-3 py-2 text-sm">
                      {question.explanation}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        </div>

        <footer className="flex flex-col gap-4 border-background/20 border-t pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-border">
          <Button
            className="border-background/40 bg-background text-foreground hover:bg-muted dark:border-border dark:bg-card dark:text-card-foreground dark:hover:bg-muted"
            onClick={resetQuestion}
            variant="outline"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            {copy.preview.reset}
          </Button>
          <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
            <Button
              className="border-background/40 bg-background text-foreground hover:bg-muted dark:border-border dark:bg-card dark:text-card-foreground dark:hover:bg-muted"
              disabled={questionIndex === 0}
              onClick={() => moveToQuestion(questionIndex - 1)}
              variant="outline"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              {copy.preview.previous}
            </Button>
            <span className="min-w-24 text-center font-medium text-sm">
              {copy.preview.question} {questionIndex + 1}/{questions.length}
            </span>
            <Button
              className="border-background/40 bg-background text-foreground hover:bg-muted dark:border-border dark:bg-card dark:text-card-foreground dark:hover:bg-muted"
              disabled={questionIndex === questions.length - 1}
              onClick={() => moveToQuestion(questionIndex + 1)}
              variant="outline"
            >
              {copy.preview.next}
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
            <Button
              onClick={() => setRevealed((value) => !value)}
              variant={revealed ? 'secondary' : 'default'}
            >
              {revealed ? copy.preview.reset : copy.preview.reveal}
            </Button>
          </div>
        </footer>
      </div>
    </main>
  );
}
