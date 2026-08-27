import { ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { GameQuizCopy } from './copy';
import { GameQuizFullLeaderboardDialog } from './game-quiz-full-leaderboard-dialog';
import { GameQuizLiveLeaderboard } from './game-quiz-live-leaderboard';
import type { GameSessionSnapshot } from './types';

export function GameQuizHostScoreboard({
  copy,
  isPending,
  onNext,
  session,
}: {
  copy: GameQuizCopy;
  isPending: boolean;
  onNext: () => void;
  session: GameSessionSnapshot;
}) {
  return (
    <GameQuizLiveLeaderboard
      actions={
        <>
          <GameQuizFullLeaderboardDialog
            copy={copy}
            leaderboard={session.leaderboard}
          />
          <Button
            className="rounded-full px-6 shadow-sm sm:min-w-48"
            disabled={isPending}
            onClick={onNext}
            size="lg"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : null}
            {copy.host.next}
            {!isPending ? (
              <ArrowRight className="size-4" aria-hidden="true" />
            ) : null}
          </Button>
        </>
      }
      copy={copy}
      session={session}
      variant="host"
    />
  );
}

export function GameQuizPlayerScoreboard({
  copy,
  session,
}: {
  copy: GameQuizCopy;
  session: GameSessionSnapshot;
}) {
  return (
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
  );
}
