'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Trophy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { gameQuizApi } from './api';
import { type GameQuizCopy, gameQuizCopy } from './copy';
import { GameSessionError, GameSessionLoading } from './game-quiz-host-client';
import { GameQuizPlayerQuestionStage } from './game-quiz-player-question-stage';
import { GameQuizPodium } from './game-quiz-podium';
import { GameQuizPlayerScoreboard } from './game-quiz-scoreboard-stage';
import type { GameSessionSnapshot } from './types';
import { useGameQuizRealtime } from './use-game-quiz-realtime';
import { useLiveGameSession } from './use-live-game-session';

interface GameQuizPlayerClientProps {
  copy?: GameQuizCopy;
}

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
    return <GameQuizPlayerScoreboard copy={copy} session={session} />;
  }
  if (!session.currentRound)
    return <WaitingPanel copy={copy} session={session} />;

  return (
    <GameQuizPlayerQuestionStage
      copy={copy}
      isAnswerPending={answerMutation.isPending}
      onAnswer={(optionId) => answerMutation.mutate(optionId)}
      session={session}
    />
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
    <main className="min-h-dvh">
      <GameQuizPodium
        copy={copy}
        participant={session.participant}
        session={session}
        title={copy.host.congratulations}
      />
    </main>
  );
}
