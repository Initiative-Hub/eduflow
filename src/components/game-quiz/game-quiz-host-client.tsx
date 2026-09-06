'use client';

import {
  Copy,
  Link as LinkIcon,
  Loader2,
  Lock,
  Play,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { GameHostAction } from './api';
import { type GameQuizCopy, gameQuizCopy } from './copy';
import { GameQuizFullLeaderboardDialog } from './game-quiz-full-leaderboard-dialog';
import { GameQuizHostQuestionStage } from './game-quiz-host-question-stage';
import { GameQuizJoinQrCode } from './game-quiz-join-qr-code';
import { GameQuizPodium } from './game-quiz-podium';
import { GameQuizHostScoreboard } from './game-quiz-scoreboard-stage';
import { clearLiveGameSession } from './live-game-session';
import type { GameSessionSnapshot } from './types';
import { useLiveGameClient } from './use-live-game-client';
import { useLiveGameSession } from './use-live-game-session';

interface GameQuizHostClientProps {
  gameQuizId: string;
  copy?: GameQuizCopy;
}

export function GameQuizHostClient({
  gameQuizId,
  copy = gameQuizCopy,
}: GameQuizHostClientProps) {
  const router = useRouter();
  const { session: liveSession, isHydrated } = useLiveGameSession('HOST');
  const hasCheckedTabOwnership = useRef(false);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [isCommandPending, setIsCommandPending] = useState(false);
  const { error, reconnect, send, snapshot, status } =
    useLiveGameClient(liveSession);

  const runCommand = async (
    action: GameHostAction,
    joiningLocked?: boolean
  ) => {
    if (!snapshot) return;
    setIsCommandPending(true);
    try {
      await send({
        type: 'host.command',
        action,
        expectedStateVersion: snapshot.stateVersion,
        ...(action === 'SET_JOINING_LOCKED' ? { joiningLocked } : {}),
      });
    } catch {
      toast.error(copy.common.error);
    } finally {
      setIsCommandPending(false);
    }
  };

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

  if (
    !isHydrated ||
    !liveSession ||
    !isSessionReady ||
    (status === 'CONNECTING' && !snapshot)
  )
    return <GameSessionLoading copy={copy} />;
  if (error || !snapshot) {
    return <GameSessionError copy={copy} onRetry={reconnect} />;
  }

  const session = snapshot as GameSessionSnapshot;
  if (session.phase === 'LOBBY') {
    return (
      <HostLobby
        copy={copy}
        isPending={isCommandPending}
        onCommand={runCommand}
        session={session}
      />
    );
  }
  if (session.phase === 'FINAL_CELEBRATION') {
    return (
      <HostPodium
        copy={copy}
        isPending={isCommandPending}
        reportHref={`/games/${gameQuizId}/report?sessionId=${encodeURIComponent(liveSession.sessionId)}`}
        session={session}
      />
    );
  }
  if (!session.currentRound)
    return <GameSessionError copy={copy} onRetry={reconnect} />;

  const answerCount = session.answerCount;

  if (session.phase === 'SCOREBOARD') {
    return (
      <GameQuizHostScoreboard
        copy={copy}
        isPending={isCommandPending}
        onNext={() => void runCommand('NEXT')}
        session={session}
      />
    );
  }

  return (
    <GameQuizHostQuestionStage
      answerCount={answerCount}
      copy={copy}
      isPending={isCommandPending}
      onCommand={(actionToRun) => void runCommand(actionToRun)}
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
    <main className="dashboard-full-bleed min-h-[calc(100dvh-4rem)]">
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
          className="rounded-full bg-background px-4 py-3"
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
