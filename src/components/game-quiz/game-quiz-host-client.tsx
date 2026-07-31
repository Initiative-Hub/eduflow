'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Loader2, Lock, Play, Radio, Unlock, Users } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { type GameHostAction, gameQuizApi } from './api';
import { type GameQuizCopy, gameQuizCopy } from './copy';
import type { GameSessionPhase, GameSessionSnapshot } from './types';
import { useGameQuizRealtime } from './use-game-quiz-realtime';

interface GameQuizHostClientProps {
  sessionId: string;
  copy?: GameQuizCopy;
}

const phaseActions: Record<
  GameSessionPhase,
  {
    action: GameHostAction;
    label: keyof GameQuizCopy['host'];
  } | null
> = {
  LOBBY: { action: 'START', label: 'start' },
  QUESTION_OPEN: { action: 'LOCK_ANSWERS', label: 'lockAnswers' },
  ANSWER_LOCKED: { action: 'REVEAL', label: 'reveal' },
  REVEAL: { action: 'SHOW_PROGRESS', label: 'next' },
  PROGRESS: { action: 'OPEN_NEXT', label: 'next' },
  FINAL_CELEBRATION: { action: 'END', label: 'finish' },
  REPORT: null,
  ENDED: null,
};

export function GameQuizHostClient({
  sessionId,
  copy = gameQuizCopy,
}: GameQuizHostClientProps) {
  const queryClient = useQueryClient();
  const sessionQuery = useQuery({
    queryKey: ['game-session', sessionId, 'host'],
    queryFn: () => gameQuizApi.getSession(sessionId),
    refetchInterval: 1500,
  });
  const progressQuery = useQuery({
    queryKey: ['game-session', sessionId, 'answer-progress'],
    queryFn: () => gameQuizApi.answerProgress(sessionId),
    refetchInterval: 1500,
  });
  useGameQuizRealtime({ sessionId, audience: 'HOST' });
  const commandMutation = useMutation({
    mutationFn: ({
      action,
      joiningLocked,
    }: {
      action: GameHostAction;
      joiningLocked?: boolean;
    }) => {
      const session = sessionQuery.data;
      if (!session) throw new Error('Session unavailable');
      return gameQuizApi.command(
        sessionId,
        action,
        session.stateVersion,
        joiningLocked
      );
    },
    onSuccess: (session) => {
      queryClient.setQueryData(['game-session', sessionId, 'host'], session);
      queryClient.setQueryData(['game-session', sessionId, 'player'], session);
    },
    onError: () => toast.error(copy.common.error),
  });

  if (sessionQuery.isPending) return <GameSessionLoading copy={copy} />;
  if (sessionQuery.isError || !sessionQuery.data)
    return (
      <GameSessionError copy={copy} onRetry={() => sessionQuery.refetch()} />
    );

  const session = sessionQuery.data;
  const answerCount = progressQuery.data?.answerCount ?? session.answerCount;
  const primaryAction = phaseActions[session.phase];
  const joinPath = `/games/join?code=${session.joinCode}`;

  return (
    <main className="space-y-6 pb-10">
      <header className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary text-sm">
            <Radio className="size-4" aria-hidden="true" /> {session.phase}
          </div>
          <h1 className="mt-1 font-semibold text-3xl">{copy.host.title}</h1>
          <p className="mt-2 text-muted-foreground">{session.gameTitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {primaryAction ? (
            <Button
              disabled={commandMutation.isPending}
              onClick={() =>
                commandMutation.mutate({ action: primaryAction.action })
              }
            >
              {commandMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Play className="size-4" />
              )}
              {copy.host[primaryAction.label]}
            </Button>
          ) : null}
          {session.phase !== 'ENDED' ? (
            <Button
              disabled={commandMutation.isPending}
              onClick={() => commandMutation.mutate({ action: 'END' })}
              variant="outline"
            >
              <Lock className="size-4" aria-hidden="true" />
              {copy.host.end}
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href={`/games/sessions/${sessionId}/report`}>
                {copy.report.title}
              </Link>
            </Button>
          )}
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="space-y-6">
          <div className="grid gap-px border bg-border sm:grid-cols-3">
            <Metric label={copy.host.joinCode} value={session.joinCode} />
            <Metric
              label={copy.host.players}
              value={String(session.participants.length)}
            />
            <Metric
              label={copy.host.answers}
              value={`${answerCount}/${session.participants.length}`}
            />
          </div>

          <section className="border bg-card p-6 sm:p-8">
            {session.phase === 'LOBBY' ? (
              <LobbyPanel copy={copy} session={session} joinPath={joinPath} />
            ) : session.currentRound ? (
              <HostRoundPanel copy={copy} session={session} />
            ) : (
              <div className="py-12 text-center">
                <h2 className="font-semibold text-2xl">
                  {copy.player.finishTitle}
                </h2>
                <p className="mt-2 text-muted-foreground">
                  {copy.player.finishDescription}
                </p>
              </div>
            )}
          </section>
        </section>

        <aside className="border bg-card p-5 xl:sticky xl:top-0 xl:h-fit">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">{copy.host.players}</h2>
            <Button
              aria-label={
                session.joiningLocked
                  ? copy.host.unlockJoining
                  : copy.host.lockJoining
              }
              disabled={commandMutation.isPending}
              onClick={() =>
                commandMutation.mutate({
                  action: 'SET_JOINING_LOCKED',
                  joiningLocked: !session.joiningLocked,
                })
              }
              size="icon"
              variant="ghost"
            >
              {session.joiningLocked ? (
                <Unlock className="size-4" aria-hidden="true" />
              ) : (
                <Lock className="size-4" aria-hidden="true" />
              )}
            </Button>
          </div>
          <p className="mt-1 text-muted-foreground text-xs">
            {session.joiningLocked ? copy.host.joinLocked : copy.host.joinOpen}
          </p>
          {session.participants.length === 0 ? (
            <p className="py-8 text-muted-foreground text-sm">
              {copy.host.noPlayers}
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {session.participants.map((participant) => (
                <li
                  className="flex items-center justify-between border-b py-2 text-sm last:border-0"
                  key={participant.id}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className={`size-2 rounded-full ${participant.isOnline ? 'bg-success' : 'bg-muted-foreground'}`}
                    />{' '}
                    <span className="truncate">{participant.displayName}</span>
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {participant.score}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </main>
  );
}

function LobbyPanel({
  copy,
  joinPath,
  session,
}: {
  copy: GameQuizCopy;
  joinPath: string;
  session: GameSessionSnapshot;
}) {
  const copyJoinLink = async () => {
    await navigator.clipboard.writeText(
      new URL(joinPath, window.location.origin).toString()
    );
    toast.success(copy.common.copied);
  };
  return (
    <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
      <div>
        <p className="text-muted-foreground text-sm">{copy.host.lobby}</p>
        <h2 className="mt-2 font-semibold text-4xl tracking-[0.12em]">
          {session.joinCode}
        </h2>
        <p className="mt-3 max-w-md text-muted-foreground">
          {copy.join.description}
        </p>
        <Button className="mt-5" onClick={copyJoinLink} variant="outline">
          <Copy className="size-4" aria-hidden="true" />
          {copy.host.copyLink}
        </Button>
      </div>
      <div className="grid size-36 place-items-center border-8 border-primary/15 bg-primary/5 text-primary">
        <Users className="size-12" aria-hidden="true" />
      </div>
    </div>
  );
}

function HostRoundPanel({
  copy,
  session,
}: {
  copy: GameQuizCopy;
  session: GameSessionSnapshot;
}) {
  const round = session.currentRound as NonNullable<
    GameSessionSnapshot['currentRound']
  >;
  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[url('/images/game-quiz/learning-rally-stage.png')] bg-cover bg-center opacity-15"
      />
      <div className="relative">
        <div className="flex items-center justify-between gap-4 text-muted-foreground text-sm">
          <span>
            {copy.editor.question} {session.currentRoundIndex + 1}/
            {session.totalRounds}
          </span>
          <span>
            {round.timeLimitSeconds} {copy.editor.seconds}
          </span>
        </div>
        <h2 className="mt-5 max-w-3xl font-semibold text-3xl leading-tight">
          {round.prompt}
        </h2>
        {round.hint ? (
          <p className="mt-4 border-primary border-l-2 pl-3 text-muted-foreground text-sm">
            {copy.player.hint}: {round.hint}
          </p>
        ) : null}
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {round.options.map((option) => (
            <div
              className={`border p-4 text-sm ${session.phase === 'REVEAL' && option.isCorrect ? 'border-success bg-success/10' : ''}`}
              key={option.id}
            >
              {option.text}
            </div>
          ))}
        </div>
        {session.phase === 'REVEAL' && round.explanation ? (
          <div className="mt-6 border-t pt-5">
            <p className="font-medium">{copy.editor.explanation}</p>
            <p className="mt-2 text-muted-foreground">{round.explanation}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card p-4">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 font-semibold text-2xl tabular-nums">{value}</p>
    </div>
  );
}

export function GameSessionLoading({
  copy = gameQuizCopy,
}: {
  copy?: GameQuizCopy;
}) {
  return (
    <div className="flex min-h-72 items-center justify-center text-muted-foreground">
      <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
      {copy.common.loading}
    </div>
  );
}

export function GameSessionError({
  copy = gameQuizCopy,
  onRetry,
}: {
  copy?: GameQuizCopy;
  onRetry: () => void;
}) {
  return (
    <section
      className="border border-destructive/30 bg-destructive/5 p-6"
      role="alert"
    >
      <p className="text-destructive">{copy.common.error}</p>
      <Button className="mt-4" onClick={onRetry} variant="outline">
        {copy.common.retry}
      </Button>
    </section>
  );
}
