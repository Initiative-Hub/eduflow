'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { type GameQuizCopy, gameQuizCopy } from './copy';
import { GameSessionError, GameSessionLoading } from './game-quiz-host-client';
import { GameQuizPlayerQuestionStage } from './game-quiz-player-question-stage';
import { GameQuizPodium } from './game-quiz-podium';
import { GameQuizPlayerScoreboard } from './game-quiz-scoreboard-stage';
import type { GameSessionSnapshot } from './types';
import { useLiveGameClient } from './use-live-game-client';
import { useLiveGameSession } from './use-live-game-session';

interface GameQuizPlayerClientProps {
  copy?: GameQuizCopy;
}

export function GameQuizPlayerClient({
  copy = gameQuizCopy,
}: GameQuizPlayerClientProps) {
  const router = useRouter();
  const { session: liveSession, isHydrated } =
    useLiveGameSession('PARTICIPANT');
  const [isAnswerPending, setIsAnswerPending] = useState(false);
  const { error, reconnect, send, snapshot, status } =
    useLiveGameClient(liveSession);

  const answer = async (optionId: string) => {
    const roundId = snapshot?.currentRound?.id;
    if (!roundId) return;
    setIsAnswerPending(true);
    try {
      await send({
        type: 'player.answer',
        idempotencyKey: crypto.randomUUID(),
        roundId,
        selectedOptionId: optionId,
      });
    } catch {
      toast.error(copy.common.error);
    } finally {
      setIsAnswerPending(false);
    }
  };

  useEffect(() => {
    if (isHydrated && !liveSession) router.replace('/games/join');
  }, [isHydrated, liveSession, router]);

  if (!isHydrated || !liveSession || (status === 'CONNECTING' && !snapshot))
    return <GameSessionLoading copy={copy} />;
  if (error || !snapshot)
    return <GameSessionError copy={copy} onRetry={reconnect} />;

  const session = snapshot as GameSessionSnapshot;
  if (session.phase === 'FINAL_CELEBRATION')
    return session.closedReason === 'HOST_LEFT' ? (
      <HostEndedPanel copy={copy} />
    ) : (
      <PlayerPodium copy={copy} session={session} />
    );
  if (session.phase === 'LOBBY')
    return <WaitingPanel copy={copy} session={session} />;
  if (session.phase === 'SCOREBOARD') {
    return <GameQuizPlayerScoreboard copy={copy} session={session} />;
  }
  if (!session.currentRound)
    return <WaitingPanel copy={copy} session={session} />;

  return (
    <GameQuizPlayerQuestionStage
      copy={copy}
      isAnswerPending={isAnswerPending}
      onAnswer={(optionId) => void answer(optionId)}
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
