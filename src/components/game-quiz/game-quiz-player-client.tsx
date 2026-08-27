'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, Star, Trophy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { gameQuizApi } from './api';
import { type GameQuizCopy, gameQuizCopy } from './copy';
import { GameSessionError, GameSessionLoading } from './game-quiz-host-client';
import { GameQuizLiveLeaderboard } from './game-quiz-live-leaderboard';
import { GameQuizPodium } from './game-quiz-podium';
import type { GameSessionSnapshot } from './types';
import { useGameQuizRealtime } from './use-game-quiz-realtime';
import { useLiveGameSession } from './use-live-game-session';

interface GameQuizPlayerClientProps {
  copy?: GameQuizCopy;
}

const PLAYER_OPTION_STYLES = [
  {
    border: 'border-l-red-500',
    accent: 'text-red-500',
    accentBg: 'bg-red-50 dark:bg-red-950/20',
  },
  {
    border: 'border-l-blue-600',
    accent: 'text-blue-600',
    accentBg: 'bg-blue-50 dark:bg-blue-950/20',
  },
  {
    border: 'border-l-amber-500',
    accent: 'text-amber-500',
    accentBg: 'bg-amber-50 dark:bg-amber-950/20',
  },
  {
    border: 'border-l-green-600',
    accent: 'text-green-600',
    accentBg: 'bg-green-50 dark:bg-green-950/20',
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

export function GameQuizPlayerClient({
  copy = gameQuizCopy,
}: GameQuizPlayerClientProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { session: liveSession, isHydrated } =
    useLiveGameSession('PARTICIPANT');
  const sessionQuery = useQuery({
    queryKey: ['live-game', 'participant', liveSession?.sessionId],
    queryFn: () => gameQuizApi.getParticipantSession(liveSession!.sessionId),
    enabled: Boolean(liveSession),
    refetchInterval: 2000,
  });
  useGameQuizRealtime({
    audience: 'PARTICIPANT',
    realtimeKey: sessionQuery.data?.realtimeKey,
    participantRealtimeKey: sessionQuery.data?.participant?.realtimeKey,
    queryKey: ['live-game', 'participant', liveSession?.sessionId],
  });
  const answerMutation = useMutation({
    mutationFn: (optionId: string) => {
      const roundId = sessionQuery.data?.currentRound?.id;
      if (!roundId) throw new Error('Round unavailable');
      return gameQuizApi.submitAnswer(
        liveSession!.sessionId,
        roundId,
        optionId,
        crypto.randomUUID()
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['live-game', 'participant', liveSession?.sessionId],
      }),
    onError: () => toast.error(copy.common.error),
  });
  const presenceMutation = useMutation({
    mutationFn: () => gameQuizApi.heartbeat(liveSession!.sessionId),
  });
  const { mutate: sendPresence } = presenceMutation;

  useEffect(() => {
    if (!liveSession) return;
    sendPresence();
    const interval = window.setInterval(sendPresence, 25_000);
    return () => window.clearInterval(interval);
  }, [liveSession, sendPresence]);

  useEffect(() => {
    if (isHydrated && !liveSession) router.replace('/games/join');
  }, [isHydrated, liveSession, router]);

  if (!isHydrated || !liveSession || sessionQuery.isPending)
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
      <main className="min-h-[calc(100vh-6rem)] bg-linear-to-b from-primary/5 via-background to-muted/30 px-3 py-4 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-3xl">
          <GameQuizLiveLeaderboard
            actions={
              <div className="flex items-center justify-center gap-2 rounded-full bg-muted px-4 py-2.5 text-muted-foreground text-sm">
                <span
                  className="size-2 rounded-full bg-primary motion-safe:animate-pulse"
                  aria-hidden="true"
                />
                {copy.player.waitingForNext}
              </div>
            }
            copy={copy}
            session={session}
            variant="player"
          />
        </div>
      </main>
    );
  }
  if (!session.currentRound)
    return <WaitingPanel copy={copy} session={session} />;

  const isOpen = session.phase === 'QUESTION_OPEN';
  const submitted = Boolean(session.myAnswer);
  return (
    <main className="flex min-h-[calc(100vh-6rem)] flex-col bg-muted/40 px-3 py-3 sm:px-6 sm:py-6 dark:bg-muted/10">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
        <PlayerScoreBadge score={session.participant?.score ?? 0} />

        <PlayerProgressBar
          copy={copy}
          currentIndex={session.currentRoundIndex}
          joinCode={session.joinCode}
          totalRounds={session.totalRounds}
        />

        {session.phase !== 'REVEAL' ? (
          <Card className="mb-3 border-border/60 bg-background px-5 py-4 text-center shadow-sm sm:px-7">
            <h1 className="font-bold text-foreground text-lg leading-snug sm:text-2xl">
              {session.currentRound.prompt}
            </h1>
            {session.currentRound.hint ? (
              <p className="mt-2 text-muted-foreground text-sm">
                {copy.player.hint}: {session.currentRound.hint}
              </p>
            ) : null}
          </Card>
        ) : null}

        {isOpen && !submitted ? (
          <div className="grid flex-1 grid-cols-2 gap-3">
            {session.currentRound.options.map((option, optionIndex) => {
              const style =
                PLAYER_OPTION_STYLES[optionIndex] ?? PLAYER_OPTION_STYLES[0];
              const shape = KAHOOT_SHAPES[optionIndex] ?? KAHOOT_SHAPES[0];

              return (
                <button
                  className={cn(
                    'flex flex-col items-center justify-center gap-3 border-l-4 bg-background p-4 shadow-md transition-all',
                    'hover:scale-[1.01] hover:shadow-lg active:scale-[0.98]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                    'disabled:cursor-not-allowed disabled:opacity-60',
                    style.border
                  )}
                  disabled={answerMutation.isPending}
                  key={option.id}
                  onClick={() => answerMutation.mutate(option.id)}
                  type="button"
                >
                  <span
                    className={cn(
                      'grid size-12 place-items-center rounded-full',
                      style.accentBg,
                      style.accent
                    )}
                  >
                    {shape}
                  </span>
                  <span className="text-center font-semibold text-foreground text-sm">
                    {option.text}
                  </span>
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
    </main>
  );
}

function PlayerScoreBadge({ score }: { score: number }) {
  return (
    <div className="flex items-center justify-end pb-2">
      <Badge
        variant="outline"
        className="h-auto gap-1.5 border-amber-300/40 bg-amber-50 px-3 py-1.5 text-amber-700 shadow-sm dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300"
      >
        <Star className="size-4 fill-current" aria-hidden="true" />
        <span className="font-semibold tabular-nums">
          {score.toLocaleString()}
        </span>
      </Badge>
    </div>
  );
}

function PlayerProgressBar({
  copy,
  currentIndex,
  joinCode,
  totalRounds,
}: {
  copy: GameQuizCopy;
  currentIndex: number;
  joinCode: string;
  totalRounds: number;
}) {
  const progress =
    totalRounds > 0 ? ((currentIndex + 1) / totalRounds) * 100 : 0;

  return (
    <div className="space-y-2 pb-3">
      <div className="flex items-center justify-between gap-4">
        <Badge variant="secondary" className="font-medium text-xs">
          {copy.player.pin}: {joinCode || '-'}
        </Badge>
        <span className="font-medium text-sm">
          {copy.player.question} {currentIndex + 1}/{totalRounds}
        </span>
      </div>
      <Progress value={progress} className="h-1.5" />
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
        <Card className="rounded-xl p-5 text-sm shadow-xs">
          <span className="font-medium">{copy.editor.explanation}: </span>
          {session.currentRound.explanation}
        </Card>
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
    <main className="min-h-[60vh] py-4 sm:py-10">
      <GameQuizPodium
        copy={copy}
        participant={session.participant}
        session={session}
        title={copy.host.congratulations}
      />
    </main>
  );
}
