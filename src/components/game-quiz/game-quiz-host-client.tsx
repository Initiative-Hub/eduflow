'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  Clock3,
  Copy,
  Ellipsis,
  Loader2,
  Play,
  Radio,
  SkipForward,
  Trophy,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type GameHostAction, gameQuizApi } from './api';
import { type GameQuizCopy, gameQuizCopy } from './copy';
import { GameQuizPodium } from './game-quiz-podium';
import type { GameQuizOption, GameSessionSnapshot } from './types';
import { useGameQuizRealtime } from './use-game-quiz-realtime';
import { clearLiveGameContext } from './live-game-context';
import { useLiveGameContext } from './use-live-game-context';

interface GameQuizHostClientProps {
  gameQuizId: string;
  copy?: GameQuizCopy;
}

export function GameQuizHostClient({
  gameQuizId,
  copy = gameQuizCopy,
}: GameQuizHostClientProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { context, isHydrated } = useLiveGameContext('HOST');
  const hasCheckedTabOwnership = useRef(false);
  const hasHandledInitialNavigation = useRef(false);
  const isViewingReport = useRef(false);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const closeMutation = useMutation({
    mutationFn: () => gameQuizApi.closeHostSession(gameQuizId, context!),
    onSettled: () => {
      clearLiveGameContext('HOST', context?.contextKey);
      router.replace(`/games/${gameQuizId}/edit`);
    },
  });
  const sessionQuery = useQuery({
    queryKey: ['live-game', 'host', context?.contextKey],
    queryFn: () => gameQuizApi.getHostSession(gameQuizId, context!),
    enabled: Boolean(context && isSessionReady),
    refetchInterval: 1_500,
  });
  const progressQuery = useQuery({
    queryKey: ['live-game', 'host-progress', context?.contextKey],
    queryFn: () => gameQuizApi.answerProgress(gameQuizId, context!),
    enabled: Boolean(context && isSessionReady),
    refetchInterval: 1_500,
  });
  useGameQuizRealtime({
    audience: 'HOST',
    realtimeKey: sessionQuery.data?.realtimeKey,
    queryKey: ['live-game', 'host', context?.contextKey],
  });

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
        gameQuizId,
        context!,
        action,
        session.stateVersion,
        joiningLocked
      );
    },
    onSuccess: (session) => {
      queryClient.setQueryData(
        ['live-game', 'host', context?.contextKey],
        session
      );
      void queryClient.invalidateQueries({
        queryKey: ['live-game', 'host-progress', context?.contextKey],
      });
    },
    onError: () => toast.error(copy.common.error),
  });

  useEffect(() => {
    if (!isHydrated || !context || hasCheckedTabOwnership.current) return;
    if (typeof BroadcastChannel === 'undefined') return;
    hasCheckedTabOwnership.current = true;
    const channel = new BroadcastChannel('eduflow-live-game-host-tabs');
    const tabId = crypto.randomUUID();
    let isDuplicate = false;
    channel.onmessage = (event) => {
      const message = event.data as {
        contextKey?: string;
        sender?: string;
        type?: string;
      };
      if (message.contextKey !== context.contextKey || message.sender === tabId)
        return;
      if (message.type === 'probe') {
        channel.postMessage({
          contextKey: context.contextKey,
          sender: tabId,
          type: 'active',
        });
      }
      if (message.type === 'active') isDuplicate = true;
    };
    channel.postMessage({
      contextKey: context.contextKey,
      sender: tabId,
      type: 'probe',
    });
    const timeout = window.setTimeout(() => {
      if (isDuplicate) {
        clearLiveGameContext('HOST', context.contextKey);
        window.location.replace(`/games/${gameQuizId}/edit`);
      }
    }, 100);
    return () => {
      window.clearTimeout(timeout);
      channel.close();
    };
  }, [context, gameQuizId, isHydrated]);

  useEffect(() => {
    if (!isHydrated || hasHandledInitialNavigation.current) return;
    hasHandledInitialNavigation.current = true;
    const navigation = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (!context) {
      router.replace(`/games/${gameQuizId}/edit`);
    } else if (navigation?.type === 'reload') {
      closeMutation.mutate();
    } else {
      setIsSessionReady(true);
    }
  }, [closeMutation, context, gameQuizId, isHydrated, router]);

  useEffect(() => {
    if (!context || !isSessionReady) return;
    const heartbeat = () => void gameQuizApi.heartbeatHost(gameQuizId, context);
    heartbeat();
    const interval = window.setInterval(heartbeat, 10_000);
    const close = () => {
      void fetch(`/api/v1/game-quizzes/${gameQuizId}/live-game/close`, {
        body: '{}',
        headers: {
          'Content-Type': 'application/json',
          'X-Live-Game-Context': context.token,
        },
        keepalive: true,
        method: 'POST',
      });
    };
    window.addEventListener('pagehide', close);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('pagehide', close);
    };
  }, [context, gameQuizId, isSessionReady]);

  useEffect(() => {
    if (sessionQuery.data?.phase === 'REPORT') {
      if (isViewingReport.current && context) {
        router.replace(
          `/games/${gameQuizId}/report?run=${encodeURIComponent(context.contextKey)}`
        );
      } else {
        clearLiveGameContext('HOST', context?.contextKey);
        router.replace(`/games/${gameQuizId}/edit`);
      }
    }
  }, [context, gameQuizId, router, sessionQuery.data?.phase]);

  useEffect(() => {
    if (!isSessionReady || !sessionQuery.isError) return;
    clearLiveGameContext('HOST', context?.contextKey);
    router.replace(`/games/${gameQuizId}/edit`);
  }, [context, gameQuizId, isSessionReady, router, sessionQuery.isError]);

  if (!isHydrated || !context || !isSessionReady || sessionQuery.isPending)
    return <GameSessionLoading copy={copy} />;
  if (sessionQuery.isError || !sessionQuery.data) {
    return (
      <GameSessionError copy={copy} onRetry={() => sessionQuery.refetch()} />
    );
  }

  const session = sessionQuery.data;
  if (session.phase === 'LOBBY') {
    return (
      <HostLobby
        copy={copy}
        isPending={commandMutation.isPending}
        onCommand={(action, joiningLocked) =>
          commandMutation.mutate({ action, joiningLocked })
        }
        session={session}
      />
    );
  }
  if (session.phase === 'FINAL_CELEBRATION') {
    return (
      <HostPodium
        copy={copy}
        isPending={commandMutation.isPending}
        onViewReport={() => {
          isViewingReport.current = true;
          commandMutation.mutate({ action: 'END_SESSION' });
        }}
        session={session}
      />
    );
  }
  if (session.phase === 'REPORT')
    return <HostReport copy={copy} gameQuizId={gameQuizId} />;
  if (!session.currentRound)
    return (
      <GameSessionError copy={copy} onRetry={() => sessionQuery.refetch()} />
    );

  const action: GameHostAction =
    session.phase === 'QUESTION_OPEN' ? 'SKIP' : 'NEXT';
  const actionLabel =
    session.phase === 'QUESTION_OPEN' ? copy.host.skip : copy.host.next;
  const answerCount = progressQuery.data?.answerCount ?? session.answerCount;

  return (
    <main className="min-h-[calc(100vh-6rem)] bg-foreground px-3 py-3 text-background sm:px-6 sm:py-6 dark:bg-background dark:text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-360 flex-col">
        <header className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2">
            <div className="min-w-0">
              <p className="truncate text-background/70 text-sm dark:text-muted-foreground">
                {session.gameTitle}
              </p>
              <p className="mt-1 font-medium text-xs uppercase tracking-[0.16em]">
                {copy.player.question} {session.currentRoundIndex + 1}/
                {session.totalRounds}
              </p>
            </div>
            <SessionOverflow
              disabled={commandMutation.isPending}
              label={copy.host.endGame}
              onSelect={() => commandMutation.mutate({ action: 'END_GAME' })}
            />
          </div>
          <Button
            disabled={commandMutation.isPending}
            onClick={() => commandMutation.mutate({ action })}
            size="sm"
            variant="secondary"
          >
            {commandMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : action === 'SKIP' ? (
              <SkipForward className="size-4" aria-hidden="true" />
            ) : null}
            {actionLabel}
          </Button>
        </header>

        {session.phase === 'SCOREBOARD' ? (
          <ScoreboardStage copy={copy} session={session} />
        ) : (
          <QuestionStage
            answerCount={answerCount}
            copy={copy}
            session={session}
          />
        )}
      </div>
    </main>
  );
}

function HostLobby({
  copy,
  isPending,
  onCommand,
  session,
}: {
  copy: GameQuizCopy;
  isPending: boolean;
  onCommand: (action: GameHostAction, joiningLocked?: boolean) => void;
  session: GameSessionSnapshot;
}) {
  const copyJoinLink = async () => {
    await navigator.clipboard.writeText(
      new URL(
        `/games/join?code=${session.joinCode}`,
        window.location.origin
      ).toString()
    );
    toast.success(copy.common.copied);
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6 pb-10">
      <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary text-sm">
            <Radio className="size-4" aria-hidden="true" /> LOBBY
          </div>
          <h1 className="mt-1 font-semibold text-3xl">{copy.host.title}</h1>
          <p className="mt-2 text-muted-foreground">{session.gameTitle}</p>
        </div>
        <div className="flex gap-2">
          <Button
            disabled={isPending || session.participants.length === 0}
            onClick={() => onCommand('START')}
          >
            <Play className="size-4" aria-hidden="true" />
            {copy.host.start}
          </Button>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="border bg-card p-7 sm:p-10">
          <p className="text-muted-foreground text-sm">{copy.host.lobby}</p>
          <p className="mt-3 font-semibold text-5xl tracking-[0.16em]">
            {session.joinCode}
          </p>
          <Button className="mt-6" onClick={copyJoinLink} variant="outline">
            <Copy className="size-4" aria-hidden="true" />
            {copy.host.copyLink}
          </Button>
          {session.participants.length === 0 ? (
            <p className="mt-6 text-muted-foreground text-sm">
              {copy.host.noPlayers}
            </p>
          ) : null}
        </div>
        <aside className="border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">{copy.host.players}</h2>
            <Button
              aria-label={
                session.joiningLocked
                  ? copy.host.unlockJoining
                  : copy.host.lockJoining
              }
              disabled={isPending}
              onClick={() =>
                onCommand('SET_JOINING_LOCKED', !session.joiningLocked)
              }
              size="sm"
              variant="ghost"
            >
              {session.joiningLocked
                ? copy.host.unlockJoining
                : copy.host.lockJoining}
            </Button>
          </div>
          <ul className="mt-4 space-y-2">
            {session.participants.map((participant) => (
              <li
                className="flex items-center gap-3 border-b py-2 text-sm last:border-0"
                key={participant.id}
              >
                <Avatar size="sm">
                  <AvatarImage alt="" src={participant.image ?? undefined} />
                  <AvatarFallback>
                    {participant.displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{participant.displayName}</span>
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </main>
  );
}

function QuestionStage({
  answerCount,
  copy,
  session,
}: {
  answerCount: number;
  copy: GameQuizCopy;
  session: GameSessionSnapshot;
}) {
  const round = session.currentRound as NonNullable<
    GameSessionSnapshot['currentRound']
  >;
  const revealed = session.phase === 'REVEAL';
  const totalAnswers = round.options.reduce(
    (sum, option) => sum + (option.answerCount ?? 0),
    0
  );

  return (
    <section className="relative mt-4 flex flex-1 flex-col justify-center overflow-hidden border border-background/20 bg-foreground px-3 py-8 sm:px-8 dark:border-border dark:bg-card">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[url('/images/game-quiz/learning-rally-stage.png')] bg-center bg-cover opacity-25"
      />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          {!revealed ? (
            <CountdownBadge copy={copy} deadlineAt={round.deadlineAt} />
          ) : (
            <div />
          )}
          <div className="border border-background/35 bg-foreground/75 px-3 py-2 text-right text-sm dark:border-border dark:bg-card/90">
            <p className="font-semibold text-xl tabular-nums">{answerCount}</p>
            <p className="text-background/70 text-xs dark:text-muted-foreground">
              {copy.host.answers}
            </p>
          </div>
        </div>
        <div className="mx-auto w-full max-w-4xl bg-background px-5 py-6 text-center text-foreground shadow-2xl sm:px-10 sm:py-9">
          <h1 className="font-semibold text-2xl leading-tight sm:text-4xl">
            {round.prompt}
          </h1>
          {round.hint ? (
            <p className="mt-4 text-muted-foreground text-sm">
              {copy.player.hint}: {round.hint}
            </p>
          ) : null}
        </div>
        <div
          className={
            revealed
              ? 'grid gap-3 opacity-70 sm:grid-cols-2'
              : 'grid gap-3 sm:grid-cols-2'
          }
        >
          {round.options.map((option, index) => (
            <AnswerTile
              answerCount={option.answerCount ?? 0}
              index={index}
              key={option.id}
              option={option}
              revealed={revealed}
              totalAnswers={totalAnswers}
            />
          ))}
        </div>
        {revealed && round.explanation ? (
          <div className="mx-auto max-w-4xl border border-background/30 bg-foreground/80 px-5 py-4 text-sm dark:border-border dark:bg-card/90">
            <span className="font-medium">{copy.editor.explanation}: </span>
            {round.explanation}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function AnswerTile({
  answerCount,
  index,
  option,
  revealed,
  totalAnswers,
}: {
  answerCount: number;
  index: number;
  option: GameQuizOption;
  revealed: boolean;
  totalAnswers: number;
}) {
  const surface =
    [
      'bg-primary text-primary-foreground',
      'bg-secondary text-secondary-foreground',
      'bg-accent text-accent-foreground',
      'bg-muted text-foreground',
    ][index] ?? 'bg-muted text-foreground';
  const width =
    totalAnswers === 0 ? 0 : Math.round((answerCount / totalAnswers) * 100);
  return (
    <div
      className={`min-h-24 border border-background/25 p-4 shadow-lg ${surface} ${revealed && option.isCorrect ? 'ring-4 ring-success' : ''}`}
    >
      <div className="flex items-center gap-3">
        <span className="grid size-8 shrink-0 place-items-center border border-current font-semibold text-sm">
          {String.fromCharCode(65 + index)}
        </span>
        <span className="font-semibold text-lg">{option.text}</span>
        {revealed && option.isCorrect ? (
          <Check className="ml-auto size-6" aria-label="Correct answer" />
        ) : null}
      </div>
      {revealed ? (
        <div className="mt-4">
          <div className="h-2 overflow-hidden bg-background/35">
            <div
              className="h-full bg-background"
              style={{ width: `${width}%` }}
            />
          </div>
          <p className="mt-2 text-right font-medium text-sm tabular-nums">
            {answerCount}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function CountdownBadge({
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
  const seconds = deadlineAt
    ? Math.max(0, Math.ceil((new Date(deadlineAt).getTime() - now) / 1000))
    : 0;
  return (
    <div className="grid size-17.5 place-items-center rounded-full border-4 border-background bg-foreground text-center shadow-lg dark:border-border dark:bg-card">
      <Clock3 className="size-4" aria-hidden="true" />
      <span className="font-semibold text-lg tabular-nums leading-none">
        {seconds}
      </span>
      <span className="sr-only">{copy.editor.seconds}</span>
    </div>
  );
}

function ScoreboardStage({
  copy,
  session,
}: {
  copy: GameQuizCopy;
  session: GameSessionSnapshot;
}) {
  return (
    <section className="mt-4 flex flex-1 items-center justify-center bg-primary px-4 py-10 text-primary-foreground">
      <div className="w-full max-w-3xl">
        <div className="mx-auto mb-10 flex w-fit items-center gap-3 bg-background px-6 py-3 text-foreground shadow-xl">
          <Trophy className="size-6 text-primary" aria-hidden="true" />
          <h1 className="font-semibold text-3xl">{copy.host.scoreboard}</h1>
        </div>
        <ol className="space-y-3">
          {session.leaderboard.map((participant, index) => (
            <li
              className="flex items-center gap-4 bg-background px-5 py-4 text-foreground shadow-lg"
              key={participant.id}
            >
              <span className="w-8 font-semibold text-muted-foreground tabular-nums">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate font-semibold text-lg">
                {participant.displayName}
              </span>
              <span className="font-semibold text-xl tabular-nums">
                {participant.score}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function HostPodium({
  copy,
  isPending,
  onViewReport,
  session,
}: {
  copy: GameQuizCopy;
  isPending: boolean;
  onViewReport: () => void;
  session: GameSessionSnapshot;
}) {
  return (
    <main className="min-h-[calc(100vh-6rem)] bg-primary py-3 sm:py-6">
      <GameQuizPodium copy={copy} session={session} title={copy.host.podium}>
        <Button disabled={isPending} onClick={onViewReport} variant="secondary">
          {isPending ? (
            <Loader2 className="animate-spin" data-icon="inline-start" />
          ) : null}
          {copy.host.viewReport}
        </Button>
      </GameQuizPodium>
    </main>
  );
}

function HostReport({
  copy,
  gameQuizId,
}: {
  copy: GameQuizCopy;
  gameQuizId: string;
}) {
  return (
    <main className="mx-auto grid min-h-72 max-w-xl place-items-center text-center">
      <Link
        className="font-medium text-primary underline"
        href={`/games/${gameQuizId}/report`}
      >
        {copy.report.title}
      </Link>
    </main>
  );
}

function SessionOverflow({
  disabled,
  label,
  onSelect,
}: {
  disabled: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={label}
          disabled={disabled}
          size="icon"
          variant="ghost"
        >
          <Ellipsis className="size-5" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onSelect}>{label}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
