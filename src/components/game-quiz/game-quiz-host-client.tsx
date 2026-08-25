'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  Copy,
  Link as LinkIcon,
  Loader2,
  Lock,
  Play,
  Trophy,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { type GameHostAction, gameQuizApi } from './api';
import { type GameQuizCopy, gameQuizCopy } from './copy';
import { GameQuizFullLeaderboardDialog } from './game-quiz-full-leaderboard-dialog';
import { GameQuizJoinQrCode } from './game-quiz-join-qr-code';
import { GameQuizPodium } from './game-quiz-podium';
import { GameQuizRespondentStack } from './game-quiz-respondent-stack';
import { clearLiveGameSession } from './live-game-session';
import type { GameQuizOption, GameSessionSnapshot } from './types';
import { useGameQuizRealtime } from './use-game-quiz-realtime';
import { useHostSessionLifecycle } from './use-host-session-lifecycle';
import { useLiveGameSession } from './use-live-game-session';

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
  const { session: liveSession, isHydrated } = useLiveGameSession('HOST');
  const hasCheckedTabOwnership = useRef(false);
  const [isSessionReady, setIsSessionReady] = useState(false);

  const sessionQuery = useQuery({
    queryKey: ['live-game', 'host', liveSession?.sessionId],
    queryFn: () =>
      gameQuizApi.getHostSession(gameQuizId, liveSession!.sessionId),
    enabled: Boolean(liveSession && isSessionReady),
    refetchInterval: 1_500,
  });
  const progressQuery = useQuery({
    queryKey: ['live-game', 'host-progress', liveSession?.sessionId],
    queryFn: () =>
      gameQuizApi.answerProgress(gameQuizId, liveSession!.sessionId),
    enabled: Boolean(liveSession && isSessionReady),
    refetchInterval: 1_500,
  });
  useGameQuizRealtime({
    audience: 'HOST',
    realtimeKey: sessionQuery.data?.realtimeKey,
    queryKey: ['live-game', 'host', liveSession?.sessionId],
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
        liveSession!.sessionId,
        action,
        session.stateVersion,
        joiningLocked
      );
    },
    onSuccess: (session) => {
      queryClient.setQueryData(
        ['live-game', 'host', liveSession?.sessionId],
        session
      );
      void queryClient.invalidateQueries({
        queryKey: ['live-game', 'host-progress', liveSession?.sessionId],
      });
    },
    onError: () => toast.error(copy.common.error),
  });

  useEffect(() => {
    if (!isHydrated || !liveSession || hasCheckedTabOwnership.current) return;
    if (typeof BroadcastChannel === 'undefined') return;
    hasCheckedTabOwnership.current = true;
    const channel = new BroadcastChannel('eduflow-live-game-host-tabs');
    const tabId = crypto.randomUUID();
    let isDuplicate = false;
    channel.onmessage = (event) => {
      const message = event.data as {
        sessionId?: string;
        sender?: string;
        type?: string;
      };
      if (
        message.sessionId !== liveSession.sessionId ||
        message.sender === tabId
      )
        return;
      if (message.type === 'probe') {
        channel.postMessage({
          sessionId: liveSession.sessionId,
          sender: tabId,
          type: 'active',
        });
      }
      if (message.type === 'active') isDuplicate = true;
    };
    channel.postMessage({
      sessionId: liveSession.sessionId,
      sender: tabId,
      type: 'probe',
    });
    const timeout = window.setTimeout(() => {
      if (isDuplicate) {
        clearLiveGameSession('HOST', liveSession.sessionId);
        window.location.replace(`/games/${gameQuizId}/edit`);
      }
    }, 100);
    return () => {
      window.clearTimeout(timeout);
      channel.close();
    };
  }, [gameQuizId, isHydrated, liveSession]);

  useEffect(() => {
    if (!isHydrated) return;

    if (!liveSession) {
      router.replace(`/games/${gameQuizId}/edit`);
    } else {
      setIsSessionReady(true);
    }
  }, [gameQuizId, isHydrated, liveSession, router]);

  useHostSessionLifecycle({
    gameQuizId,
    isSessionReady,
    sessionId: liveSession?.sessionId,
  });

  useEffect(() => {
    if (
      !isSessionReady ||
      sessionQuery.isPending ||
      (!sessionQuery.isError && sessionQuery.data && !sessionQuery.data.endedAt)
    )
      return;

    if (
      sessionQuery.isError ||
      !sessionQuery.data ||
      sessionQuery.data.endedAt
    ) {
      clearLiveGameSession('HOST', liveSession?.sessionId);
      router.replace(`/games/${gameQuizId}/edit`);
    }
  }, [
    gameQuizId,
    isSessionReady,
    liveSession,
    router,
    sessionQuery.data,
    sessionQuery.isError,
    sessionQuery.isPending,
  ]);

  if (!isHydrated || !liveSession || !isSessionReady || sessionQuery.isPending)
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
        reportHref={`/games/${gameQuizId}/report?sessionId=${encodeURIComponent(liveSession.sessionId)}`}
        session={session}
      />
    );
  }
  if (!session.currentRound)
    return (
      <GameSessionError copy={copy} onRetry={() => sessionQuery.refetch()} />
    );

  const action: GameHostAction =
    session.phase === 'QUESTION_OPEN' ? 'SKIP' : 'NEXT';
  const actionLabel =
    session.phase === 'QUESTION_OPEN' ? copy.host.skip : copy.host.next;
  const answerCount = progressQuery.data?.answerCount ?? session.answerCount;

  if (session.phase === 'SCOREBOARD') {
    return (
      <main className="min-h-[calc(100vh-6rem)] px-4 py-8">
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
          <div className="flex items-center justify-between gap-4">
            <p className="font-medium text-muted-foreground text-sm uppercase tracking-[0.2em]">
              {session.gameTitle}
            </p>
            <div />
            <Button
              className="rounded-full bg-primary px-4 py-3 font-medium text-sm shadow-xs hover:bg-primary/90"
              disabled={commandMutation.isPending}
              onClick={() => commandMutation.mutate({ action })}
            >
              {commandMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              {actionLabel}
            </Button>
          </div>
          <ScoreboardStage copy={copy} session={session} />
        </div>
      </main>
    );
  }

  return (
    <QuestionStage
      answerCount={answerCount}
      copy={copy}
      isPending={commandMutation.isPending}
      onCommand={(actionToRun) =>
        commandMutation.mutate({ action: actionToRun })
      }
      session={session}
    />
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
  const joinUrl = new URL(
    `/games/join?code=${session.joinCode}`,
    window.location.origin
  ).toString();

  const copyCode = async () => {
    await navigator.clipboard.writeText(session.joinCode);
    toast.success(copy.common.copied);
  };

  const copyJoinLink = async () => {
    await navigator.clipboard.writeText(joinUrl);
    toast.success(copy.common.copied);
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      {/* PIN Section */}
      <section className="flex flex-col items-center gap-4 text-center">
        <p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.2em]">
          {copy.host.joinAt}
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-stretch">
          <Card className="group relative flex items-center justify-center border border-border/60 px-10 py-6 shadow-lg transition-shadow hover:shadow-xl">
            <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 transition-opacity duration-200 focus-within:opacity-100 group-hover:opacity-100">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    aria-label={copy.host.joinCode}
                    onClick={copyCode}
                    size="icon-sm"
                    variant="ghost"
                  >
                    <Copy className="size-4" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{copy.host.joinCode}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    aria-label={copy.host.copyLink}
                    onClick={copyJoinLink}
                    size="icon-sm"
                    variant="ghost"
                  >
                    <LinkIcon className="size-4" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{copy.host.copyLink}</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <span className="text-center font-extrabold text-5xl tracking-widest sm:text-7xl">
              {session.joinCode}
            </span>
          </Card>
          <GameQuizJoinQrCode
            dialogTitle={copy.host.qrCodeDialogTitle}
            joinUrl={joinUrl}
            openLabel={copy.host.openQrCode}
          />
        </div>

        {/* Status badge */}
        <Badge
          variant="outline"
          className="h-auto gap-2 border-border/60 bg-card px-4 py-2 font-medium text-sm shadow-sm"
        >
          <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
          <span>{copy.host.readyToStart}</span>
          <div className="flex items-center gap-1 rounded-full bg-muted px-2 py-1">
            <Users
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="text-muted-foreground">
              {session.participants.length}
            </span>
          </div>
        </Badge>
      </section>

      {/* Joined Players */}
      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-lg">
            {copy.host.joinedPlayers}{' '}
            <span className="font-normal text-base text-muted-foreground">
              ({session.participants.length})
            </span>
          </h2>
          <div className="flex gap-2">
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
              variant="outline"
            >
              <Lock className="size-4" aria-hidden="true" />
              {session.joiningLocked
                ? copy.host.unlockJoining
                : copy.host.lockJoining}
            </Button>
            <Button
              disabled={isPending || session.participants.length === 0}
              onClick={() => onCommand('START')}
              size="sm"
            >
              <Play className="size-4" aria-hidden="true" />
              {copy.host.start}
            </Button>
          </div>
        </div>

        {session.participants.length === 0 ? (
          <p className="mt-8 text-center text-muted-foreground text-sm">
            {copy.host.noPlayers}
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {session.participants.map((participant) => (
              <Card
                className="flex flex-col items-center gap-2 px-4 py-5 text-center shadow-sm"
                key={participant.id}
              >
                <Avatar className="size-16">
                  <AvatarImage alt="" src={participant.image ?? undefined} />
                  <AvatarFallback>
                    {participant.displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="max-w-full truncate font-medium text-sm">
                  {participant.displayName}
                </span>
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function QuestionStage({
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
  const questionNumber = session.currentRoundIndex + 1;
  const action: GameHostAction =
    session.phase === 'QUESTION_OPEN' ? 'SKIP' : 'NEXT';
  const actionLabel =
    session.phase === 'QUESTION_OPEN' ? copy.host.skip : copy.host.next;

  return (
    <main className="min-h-[calc(100vh-6rem)] px-4 py-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        {/* Top Control Bar */}
        <div className="space-y-4">
          <div className="flex items-center justify-center">
            <div className="flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 py-1 pr-1 pl-3 shadow-xs">
              <span className="font-semibold text-primary text-sm uppercase tracking-[0.16em]">
                {copy.host.question}
              </span>
              <span className="rounded-full bg-primary px-2 py-0.5 font-bold text-primary-foreground text-sm tabular-nums">
                {questionNumber} / {session.totalRounds}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4">
            {/* Answers Pill (Left) */}
            <div className="flex items-center gap-2.5 rounded-full border border-border/40 bg-card px-4 py-2 shadow-xs">
              <Users className="size-4 text-purple-600" aria-hidden="true" />
              <span className="font-extrabold text-base text-foreground tabular-nums">
                {answerCount}/{totalAnswers}
              </span>
              <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                {copy.host.answersCount}
              </span>
            </div>

            {/* Timer and question progress (Center) */}
            {!revealed ? (
              <CountdownBadge deadlineAt={round.deadlineAt} />
            ) : (
              <div className="size-16" />
            )}

            {/* Action Pill Buttons (Right) */}
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

        {/* Question Prompt Card */}
        <Card className="mx-auto w-full rounded-2xl border border-slate-100 bg-card p-8 text-center shadow-xs sm:p-12 dark:border-border">
          <h1 className="font-extrabold text-3xl text-slate-900 leading-snug sm:text-4xl dark:text-foreground">
            {round.prompt}
          </h1>
          {round.hint ? (
            <p className="mt-4 font-medium text-muted-foreground text-sm">
              {copy.player.hint}: {round.hint}
            </p>
          ) : null}
        </Card>

        {/* Answer Tiles 2x2 Grid */}
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

        {/* Explanation Card */}
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

const KAHOOT_OPTION_STYLES = [
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

const KAHOOT_SHAPES = [
  /* triangle */
  <svg
    key="triangle"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="size-5"
    aria-hidden="true"
  >
    <polygon points="12,3 22,21 2,21" />
  </svg>,
  /* diamond */
  <svg
    key="diamond"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="size-5"
    aria-hidden="true"
  >
    <polygon points="12,2 22,12 12,22 2,12" />
  </svg>,
  /* circle */
  <svg
    key="circle"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="size-5"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
  </svg>,
  /* square */
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
  const style = KAHOOT_OPTION_STYLES[index] ?? KAHOOT_OPTION_STYLES[0];
  const shape = KAHOOT_SHAPES[index] ?? KAHOOT_SHAPES[0];
  const width =
    totalAnswers === 0 ? 0 : Math.round((answerCount / totalAnswers) * 100);
  return (
    <Card
      className={cn(
        'flex flex-col justify-between rounded-xl border border-slate-100 border-l-4 bg-card p-5 shadow-xs transition-all dark:border-border',
        style.border,
        revealed && option.isCorrect
          ? 'bg-emerald-50/60 ring-2 ring-emerald-500 dark:bg-emerald-950/20'
          : '',
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
        <span className="font-bold text-base text-slate-800 sm:text-lg dark:text-foreground">
          {option.text}
        </span>
        {revealed && option.isCorrect ? (
          <Check
            className="ml-auto size-6 text-emerald-600"
            aria-label="Correct answer"
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
        seconds <= 5 ? 'border-red-500' : 'border-primary'
      )}
    >
      <span
        className={cn(
          'font-extrabold text-2xl tabular-nums',
          seconds <= 5 ? 'text-red-500' : 'text-primary'
        )}
      >
        {seconds}
      </span>
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
  reportHref,
  session,
}: {
  copy: GameQuizCopy;
  isPending: boolean;
  reportHref: string;
  session: GameSessionSnapshot;
}) {
  return (
    <main className="min-h-[calc(100vh-6rem)] py-3 sm:py-6">
      <GameQuizPodium
        copy={copy}
        session={session}
        title={copy.host.congratulations}
      >
        <GameQuizFullLeaderboardDialog
          copy={copy}
          leaderboard={session.leaderboard}
        />
        <Button
          asChild
          disabled={isPending}
          className="rounded-full bg-primary-foreground px-4 py-3"
          variant="outline"
        >
          <Link href={reportHref} target="_blank" rel="noreferrer">
            {isPending ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : null}
            {copy.host.viewReport}
          </Link>
        </Button>
      </GameQuizPodium>
    </main>
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
