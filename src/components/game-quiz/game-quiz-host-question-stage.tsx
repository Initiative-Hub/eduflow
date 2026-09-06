'use client';

import { Check, Loader2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { GameHostAction } from './api';
import type { GameQuizCopy } from './copy';
import { GameQuizRespondentStack } from './game-quiz-respondent-stack';
import type { GameQuizOption, GameSessionSnapshot } from './types';

const OPTION_STYLES = [
  {
    border: 'border-l-red-500',
    accent: 'text-red-500',
    accentBg: 'bg-red-50 dark:bg-red-950/40',
  },
  {
    border: 'border-l-blue-500',
    accent: 'text-blue-500',
    accentBg: 'bg-blue-50 dark:bg-blue-950/40',
  },
  {
    border: 'border-l-amber-500',
    accent: 'text-amber-500',
    accentBg: 'bg-amber-50 dark:bg-amber-950/40',
  },
  {
    border: 'border-l-emerald-500',
    accent: 'text-emerald-500',
    accentBg: 'bg-emerald-50 dark:bg-emerald-950/40',
  },
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

function AnswerTile({
  answerCount,
  copy,
  index,
  option,
  revealed,
  totalAnswers,
}: {
  answerCount: number;
  copy: GameQuizCopy;
  index: number;
  option: GameQuizOption;
  revealed: boolean;
  totalAnswers: number;
}) {
  const style = OPTION_STYLES[index] ?? OPTION_STYLES[0];
  const shape = OPTION_SHAPES[index] ?? OPTION_SHAPES[0];
  const width =
    totalAnswers === 0 ? 0 : Math.round((answerCount / totalAnswers) * 100);

  return (
    <Card
      className={cn(
        'flex flex-col justify-between rounded-xl border border-border border-l-4 bg-card p-5 shadow-xs transition-all',
        style.border,
        revealed && option.isCorrect ? 'bg-success/10 ring-2 ring-success' : '',
        revealed && !option.isCorrect ? 'opacity-50' : ''
      )}
    >
      <div className="flex items-center gap-4">
        <span
          className={cn(
            'grid size-12 shrink-0 place-items-center rounded-lg',
            style.accentBg,
            style.accent
          )}
        >
          {shape}
        </span>
        <span className="font-bold text-base text-foreground sm:text-lg">
          {option.text}
        </span>
        {revealed && option.isCorrect ? (
          <Check
            className="ml-auto size-6 text-success"
            aria-label={copy.editor.correct}
          />
        ) : null}
      </div>
      {revealed ? (
        <div className="mt-4">
          <Progress value={width} className="h-2" />
          <div className="mt-2 flex min-h-8 items-center justify-between gap-3">
            <GameQuizRespondentStack
              answerers={option.answerers ?? []}
              moreRespondentsLabels={copy.host.moreRespondents}
            />
            <p className="ml-auto font-medium text-muted-foreground text-sm tabular-nums">
              {answerCount}
            </p>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function CountdownBadge({ deadlineAt }: { deadlineAt?: string | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, []);

  const seconds = deadlineAt
    ? Math.max(0, Math.ceil((new Date(deadlineAt).getTime() - now) / 1000))
    : 0;

  return (
    <div
      className={cn(
        'flex size-16 items-center justify-center rounded-full border-4 bg-card text-center shadow-md',
        seconds <= 5 ? 'border-destructive' : 'border-primary'
      )}
    >
      <span
        className={cn(
          'font-extrabold text-2xl tabular-nums',
          seconds <= 5 ? 'text-destructive' : 'text-primary'
        )}
      >
        {seconds}
      </span>
    </div>
  );
}

export function GameQuizHostQuestionStage({
  answerCount,
  copy,
  isPending,
  onCommand,
  session,
}: {
  answerCount: number;
  copy: GameQuizCopy;
  isPending: boolean;
  onCommand: (action: GameHostAction) => void;
  session: GameSessionSnapshot;
}) {
  const round = session.currentRound as NonNullable<
    GameSessionSnapshot['currentRound']
  >;
  const revealed = session.phase === 'REVEAL';
  const totalAnswers = session.participants.length || session.answerCount || 1;
  const action: GameHostAction =
    session.phase === 'QUESTION_OPEN' ? 'SKIP' : 'NEXT';
  const actionLabel =
    session.phase === 'QUESTION_OPEN' ? copy.host.skip : copy.host.next;

  return (
    <main className="min-h-[calc(100vh-6rem)] px-4 py-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <div className="space-y-4">
          <div className="flex items-center justify-center">
            <div className="flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 py-1 pr-1 pl-3 shadow-xs">
              <span className="font-semibold text-primary text-sm uppercase tracking-[0.16em]">
                {copy.host.question}
              </span>
              <span className="rounded-full bg-primary px-2 py-0.5 font-bold text-primary-foreground text-sm tabular-nums">
                {session.currentRoundIndex + 1} / {session.totalRounds}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 rounded-full border border-border/40 bg-card px-4 py-2 shadow-xs">
              <Users className="size-4 text-primary" aria-hidden="true" />
              <span className="font-extrabold text-base text-foreground tabular-nums">
                {answerCount}/{totalAnswers}
              </span>
              <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                {copy.host.answersCount}
              </span>
            </div>

            {!revealed ? (
              <CountdownBadge deadlineAt={round.deadlineAt} />
            ) : (
              <div className="size-16" />
            )}

            <div className="flex items-center gap-2">
              <Button
                className="rounded-full border-border/60 bg-card px-4 py-3 font-medium text-foreground text-sm shadow-xs hover:bg-muted"
                disabled={isPending}
                onClick={() => onCommand(action)}
                size="sm"
                variant="outline"
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : null}
                {actionLabel}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    className="rounded-full bg-primary px-4 py-3 font-medium text-sm shadow-xs hover:bg-primary/90"
                    disabled={isPending}
                  >
                    {copy.host.endGame}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {copy.host.endGameConfirmTitle}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {copy.host.endGameConfirmDescription}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{copy.common.cancel}</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={() => onCommand('END_GAME')}
                    >
                      {copy.host.endGame}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>

        <Card className="mx-auto w-full rounded-2xl border border-border bg-card p-8 text-center shadow-xs sm:p-12">
          <h1 className="font-extrabold text-3xl text-foreground leading-snug sm:text-4xl">
            {round.prompt}
          </h1>
          {round.hint ? (
            <p className="mt-4 font-medium text-muted-foreground text-sm">
              {copy.player.hint}: {round.hint}
            </p>
          ) : null}
        </Card>

        <div
          className={cn(
            'grid grid-cols-1 gap-4 sm:grid-cols-2',
            revealed ? 'opacity-90' : ''
          )}
        >
          {round.options.map((option, index) => (
            <AnswerTile
              answerCount={option.answerCount ?? 0}
              copy={copy}
              index={index}
              key={option.id}
              option={option}
              revealed={revealed}
              totalAnswers={totalAnswers}
            />
          ))}
        </div>

        {revealed && round.explanation ? (
          <Card className="rounded-xl p-5 text-sm shadow-xs">
            <span className="font-semibold text-foreground">
              {copy.editor.explanation}:{' '}
            </span>
            <span className="text-muted-foreground">{round.explanation}</span>
          </Card>
        ) : null}
      </div>
    </main>
  );
}
