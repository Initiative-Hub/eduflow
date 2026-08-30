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
    <main className="min-h-[calc(100vh-6rem)] bg-background px-4 py-6 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <GameQuizLiveLeaderboard
          actions={
            <div className="grid w-full max-w-lg gap-3 sm:grid-cols-2">
              <GameQuizFullLeaderboardDialog
                copy={copy}
                leaderboard={session.leaderboard}
                triggerClassName="h-11 w-full px-6 shadow-xs sm:h-12"
                triggerSize="lg"
                triggerVariant="outline"
              />
              <Button
                className="h-11 w-full rounded-full px-6 shadow-md sm:h-12"
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
            </div>
          }
          copy={copy}
          session={session}
          variant="host"
        />
      </div>
    </main>
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
    <main className="min-h-[calc(100vh-6rem)] bg-background px-4 py-6 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
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
