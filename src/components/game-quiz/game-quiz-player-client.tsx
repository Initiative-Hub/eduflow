'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Clock3, Loader2, Trophy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { gameQuizApi } from './api';
import { type GameQuizCopy, gameQuizCopy } from './copy';
import { GameSessionError, GameSessionLoading } from './game-quiz-host-client';
import { GameQuizPodium } from './game-quiz-podium';
import type { GameSessionSnapshot } from './types';
import { useGameQuizRealtime } from './use-game-quiz-realtime';
import { useLiveGameContext } from './use-live-game-context';

interface GameQuizPlayerClientProps {
  copy?: GameQuizCopy;
}

const KAHOOT_OPTION_STYLES = [
  { bg: 'bg-red-500', text: 'text-white' },
  { bg: 'bg-blue-600', text: 'text-white' },
  { bg: 'bg-amber-500', text: 'text-white' },
  { bg: 'bg-green-600', text: 'text-white' },
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

export function GameQuizPlayerClient({
  copy = gameQuizCopy,
}: GameQuizPlayerClientProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { context, isHydrated } = useLiveGameContext('PARTICIPANT');
  const sessionQuery = useQuery({
    queryKey: ['live-game', 'participant', context?.contextKey],
    queryFn: () => gameQuizApi.getParticipantSession(context!),
    enabled: Boolean(context),
    refetchInterval: 2000,
  });
  useGameQuizRealtime({
    audience: 'PARTICIPANT',
    realtimeKey: sessionQuery.data?.realtimeKey,
    participantRealtimeKey: sessionQuery.data?.participant?.realtimeKey,
    queryKey: ['live-game', 'participant', context?.contextKey],
  });
  const answerMutation = useMutation({
    mutationFn: (optionId: string) => {
      const roundId = sessionQuery.data?.currentRound?.id;
      if (!roundId) throw new Error('Round unavailable');
      return gameQuizApi.submitAnswer(
        context!,
        roundId,
        optionId,
        crypto.randomUUID()
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['live-game', 'participant', context?.contextKey],
      }),
    onError: () => toast.error(copy.common.error),
  });
  const presenceMutation = useMutation({
    mutationFn: () => gameQuizApi.heartbeat(context!),
  });
  const { mutate: sendPresence } = presenceMutation;

  useEffect(() => {
    if (!context) return;
    sendPresence();
    const interval = window.setInterval(sendPresence, 25_000);
    return () => window.clearInterval(interval);
  }, [context, sendPresence]);

  useEffect(() => {
    if (isHydrated && !context) router.replace('/games/join');
  }, [context, isHydrated, router]);

  if (!isHydrated || !context || sessionQuery.isPending)
    return <GameSessionLoading copy={copy} />;
  if (sessionQuery.isError || !sessionQuery.data)
    return (
      <GameSessionError copy={copy} onRetry={() => sessionQuery.refetch()} />
    );

  const session = sessionQuery.data;
  if (session.endedAt)
    return session.closedReason === 'HOST_LEFT' ? (
      <HostEndedPanel copy={copy} />
    ) : (
      <FinishedPanel copy={copy} session={session} />
    );
  if (session.phase === 'LOBBY')
    return <WaitingPanel copy={copy} session={session} />;
  if (session.phase === 'FINAL_CELEBRATION')
    return <PlayerPodium copy={copy} session={session} />;
  if (session.phase === 'SCOREBOARD') {
    return (
      <main className="mx-auto max-w-3xl space-y-6 py-4 sm:py-10">
        <Leaderboard copy={copy} session={session} />
        <p className="text-center text-muted-foreground text-sm">
          {copy.player.waitingDescription}
        </p>
      </main>
    );
  }
  if (!session.currentRound)
    return <WaitingPanel copy={copy} session={session} />;

  const isOpen = session.phase === 'QUESTION_OPEN';
  const submitted = Boolean(session.myAnswer);
  return (
    <main className="min-h-[calc(100vh-6rem)] bg-foreground px-3 py-3 text-background sm:px-6 sm:py-6 dark:bg-background dark:text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-360 flex-col">
        <header className="flex items-center justify-between gap-3 pb-4">
          <span className="truncate font-medium text-background/70 text-sm dark:text-muted-foreground">
            {session.gameTitle}
          </span>
          <span className="whitespace-nowrap font-medium text-xs uppercase tracking-[0.16em]">
            {copy.player.question} {session.currentRoundIndex + 1}/
            {session.totalRounds}
          </span>
        </header>

        <section className="relative flex flex-1 flex-col justify-center overflow-hidden border border-background/20 bg-foreground px-3 py-6 sm:px-8 sm:py-8 dark:border-border dark:bg-card">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[url('/images/game-quiz/learning-rally-stage.png')] bg-center bg-cover opacity-25"
          />
          <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-5">
            {isOpen ? (
              <div className="flex items-center justify-between gap-4">
                <QuestionCountdown
                  copy={copy}
                  deadlineAt={session.currentRound.deadlineAt}
                />
                <div />
              </div>
            ) : null}

            <div className="mx-auto w-full max-w-4xl bg-background px-5 py-6 text-center text-foreground shadow-2xl sm:px-10 sm:py-9">
              <h1 className="font-semibold text-2xl leading-tight sm:text-4xl">
                {session.currentRound.prompt}
              </h1>
              {session.currentRound.hint ? (
                <p className="mt-4 text-muted-foreground text-sm">
                  {copy.player.hint}: {session.currentRound.hint}
                </p>
              ) : null}
            </div>

            {isOpen && !submitted ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {session.currentRound.options.map((option, optionIndex) => {
                  const style =
                    KAHOOT_OPTION_STYLES[optionIndex] ??
                    KAHOOT_OPTION_STYLES[0];
                  const shape = KAHOOT_SHAPES[optionIndex] ?? KAHOOT_SHAPES[0];
                  return (
                    <button
                      className={`flex min-h-24 items-center gap-3 p-5 text-left font-bold shadow-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${style.bg} ${style.text} hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]`}
                      disabled={answerMutation.isPending}
                      key={option.id}
                      onClick={() => answerMutation.mutate(option.id)}
                      type="button"
                    >
                      <span className="grid size-8 shrink-0 place-items-center">
                        {shape}
                      </span>
                      <span className="text-lg">{option.text}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {submitted && session.phase !== 'REVEAL' ? (
              <SubmittedPanel copy={copy} />
            ) : null}

            {session.phase === 'REVEAL' ? (
              <RevealPanel copy={copy} session={session} />
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function QuestionCountdown({
  copy,
  deadlineAt,
}: {
  copy: GameQuizCopy;
  deadlineAt?: string | null;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, []);
  if (!deadlineAt) return null;
  const seconds = Math.max(
    0,
    Math.ceil((new Date(deadlineAt).getTime() - now) / 1000)
  );
  const urgent = seconds <= 5;
  return (
    <div
      className={`grid size-17.5 place-items-center rounded-full border-4 text-center shadow-lg transition-colors duration-300 ${urgent ? 'border-red-400 bg-red-500/90 text-white' : 'border-background bg-foreground dark:border-border dark:bg-card'}`}
    >
      <Clock3 className="size-4" aria-hidden="true" />
      <span className="font-semibold text-lg tabular-nums leading-none">
        {seconds}
      </span>
      <span className="sr-only">{copy.editor.seconds}</span>
    </div>
  );
}

function WaitingPanel({
  copy,
  session,
}: {
  copy: GameQuizCopy;
  session: GameSessionSnapshot;
}) {
  return (
    <main className="mx-auto grid min-h-[60vh] max-w-xl place-items-center py-8 text-center">
      <div>
        <span className="mx-auto grid size-14 place-items-center bg-primary/10 text-primary">
          <Loader2 className="size-6 animate-spin" aria-hidden="true" />
        </span>
        <h1 className="mt-5 font-semibold text-3xl">{copy.player.waiting}</h1>
        <p className="mt-2 text-muted-foreground">
          {copy.player.waitingDescription}
        </p>
        <p className="mt-6 text-muted-foreground text-sm">
          {session.gameTitle}
        </p>
      </div>
    </main>
  );
}

function SubmittedPanel({ copy }: { copy: GameQuizCopy }) {
  return (
    <div className="mx-auto w-full max-w-4xl bg-background/90 p-6 text-center text-foreground shadow-xl backdrop-blur-sm">
      <Check className="mx-auto size-8 text-green-500" aria-hidden="true" />
      <h2 className="mt-3 font-semibold text-xl">{copy.player.submitted}</h2>
      <p className="mt-1 text-muted-foreground text-sm">
        {copy.player.submittedDescription}
      </p>
    </div>
  );
}

function RevealPanel({
  copy,
  session,
}: {
  copy: GameQuizCopy;
  session: GameSessionSnapshot;
}) {
  const answer = session.myAnswer;
  const correct = answer?.isCorrect === true;
  const correctOption = session.currentRound?.options.find(
    (option) => option.isCorrect
  );
  return (
    <div className="space-y-4">
      <div
        className={`mx-auto w-full max-w-4xl p-6 text-foreground shadow-xl ${correct ? 'border-2 border-green-500 bg-background' : 'bg-background'}`}
      >
        <div className="flex items-center gap-3">
          {correct ? (
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-green-500 text-white">
              <Check className="size-5" aria-hidden="true" />
            </span>
          ) : (
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-red-500 text-white">
              <span className="font-bold text-lg" aria-hidden="true">
                ✕
              </span>
            </span>
          )}
          <div>
            <h2 className="font-semibold text-xl">
              {correct ? copy.player.correct : copy.player.notCorrect}
            </h2>
            <p className="text-muted-foreground text-sm">
              {copy.player.reveal}
            </p>
          </div>
          {answer ? (
            <span className="ml-auto font-bold text-2xl tabular-nums">
              {answer.pointsAwarded ?? 0}{' '}
              <span className="font-normal text-muted-foreground text-sm">
                {copy.player.points}
              </span>
            </span>
          ) : null}
        </div>
        {correctOption ? (
          <p className="mt-4 border-green-500/30 border-l-2 pl-3 text-sm">
            {correctOption.text}
          </p>
        ) : null}
      </div>
      {session.currentRound?.explanation ? (
        <div className="mx-auto max-w-4xl border border-background/30 bg-foreground/80 px-5 py-4 text-sm dark:border-border dark:bg-card/90">
          <span className="font-medium">{copy.editor.explanation}: </span>
          {session.currentRound.explanation}
        </div>
      ) : null}
    </div>
  );
}

function FinishedPanel({
  copy,
  session,
}: {
  copy: GameQuizCopy;
  session: GameSessionSnapshot;
}) {
  return (
    <main className="mx-auto grid min-h-[60vh] max-w-xl place-items-center py-8 text-center">
      <div>
        <span className="mx-auto grid size-14 place-items-center bg-primary/10 text-primary">
          <Trophy className="size-7" aria-hidden="true" />
        </span>
        <h1 className="mt-5 font-semibold text-3xl">
          {copy.player.finishTitle}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {copy.player.finishDescription}
        </p>
        <p className="mt-6 font-semibold text-2xl">
          {session.participant?.score ?? 0}
        </p>
        <p className="text-muted-foreground text-sm">{copy.player.score}</p>
      </div>
    </main>
  );
}

function HostEndedPanel({ copy }: { copy: GameQuizCopy }) {
  return (
    <main className="mx-auto grid min-h-[60vh] max-w-xl place-items-center py-8 text-center">
      <div>
        <h1 className="font-semibold text-3xl">{copy.player.hostEndedTitle}</h1>
        <p className="mt-2 text-muted-foreground">
          {copy.player.hostEndedDescription}
        </p>
      </div>
    </main>
  );
}

function PlayerPodium({
  copy,
  session,
}: {
  copy: GameQuizCopy;
  session: GameSessionSnapshot;
}) {
  return (
    <main className="min-h-[60vh] bg-primary py-4 sm:py-10">
      <GameQuizPodium
        copy={copy}
        participant={session.participant}
        session={session}
        title={copy.player.podium}
      />
    </main>
  );
}

function Leaderboard({
  copy,
  session,
}: {
  copy: GameQuizCopy;
  session: GameSessionSnapshot;
}) {
  return (
    <section className="border bg-card p-5">
      <h2 className="font-semibold">{copy.player.leaderboard}</h2>
      <ol className="mt-4 space-y-2">
        {session.leaderboard.map((participant, index) => (
          <li
            className="flex items-center justify-between border-b pb-2 text-sm last:border-0"
            key={participant.id}
          >
            <span>
              {index + 1}. {participant.displayName}
            </span>
            <span className="font-medium tabular-nums">
              {participant.score}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
