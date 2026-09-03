'use client';

import { Trophy } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import ReactConfetti from 'react-confetti';
import { Card } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import type { GameQuizCopy } from './copy';
import { GameQuizPodiumPlace } from './game-quiz-podium-place';
import type { GameParticipant, GameSessionSnapshot } from './types';

function CelebrationConfetti() {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [recycle, setRecycle] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const update = () =>
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Stop recycling after 5s so confetti naturally fades out
  useEffect(() => {
    const timeout = window.setTimeout(() => setRecycle(false), 5000);
    return () => window.clearTimeout(timeout);
  }, []);

  // Respect prefers-reduced-motion
  if (!mounted) return null;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
    return null;

  return (
    <ReactConfetti
      className="fixed! pointer-events-none inset-0 z-50"
      colors={[
        '#8b5cf6',
        '#a78bfa',
        '#c4b5fd',
        '#f59e0b',
        '#fbbf24',
        '#e879f9',
        '#38bdf8',
        '#ffffff',
      ]}
      height={dimensions.height}
      numberOfPieces={200}
      recycle={recycle}
      width={dimensions.width}
    />
  );
}

export function GameQuizPodium({
  children,
  copy,
  participant,
  session,
  title,
}: {
  children?: ReactNode;
  copy: GameQuizCopy;
  participant?: GameParticipant | null;
  session: GameSessionSnapshot;
  title: string;
}) {
  const leaderboard = session.leaderboard;
  const first = leaderboard[0] ?? null;
  const second = leaderboard[1] ?? null;
  const third = leaderboard[2] ?? null;

  const participantRank = participant
    ? leaderboard.findIndex((entry) => entry.id === participant.id) + 1
    : 0;

  return (
    <section className="flex min-h-[inherit] items-center justify-center bg-background px-4 py-8 text-foreground sm:px-8 sm:py-10">
      <CelebrationConfetti />

      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 text-center sm:gap-7">
        <header className="flex max-w-2xl flex-col items-center">
          <h1 className="font-black font-heading text-3xl tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 text-balance font-medium text-muted-foreground text-sm sm:text-base">
            {copy.host.congratulationsDescription}
          </p>
        </header>

        {leaderboard.length > 0 ? (
          <div className="relative mx-auto w-full max-w-3xl">
            <div
              aria-hidden="true"
              className="absolute inset-x-[4%] -bottom-3 h-8 rounded-[50%] bg-foreground/7 blur-xl"
            />
            <div className="relative flex items-end justify-center gap-2 sm:gap-4">
              {second ? (
                <GameQuizPodiumPlace
                  participant={second}
                  place="second"
                  pointsLabel={copy.player.pts}
                />
              ) : null}

              {first ? (
                <GameQuizPodiumPlace
                  participant={first}
                  place="first"
                  pointsLabel={copy.player.pts}
                />
              ) : null}

              {third ? (
                <GameQuizPodiumPlace
                  participant={third}
                  place="third"
                  pointsLabel={copy.player.pts}
                />
              ) : null}
            </div>
            <div className="relative h-px w-full bg-border/80" />
          </div>
        ) : (
          <Empty className="border-border bg-card text-foreground">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Trophy aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>{title}</EmptyTitle>
              <EmptyDescription className="text-muted-foreground">
                {copy.player.noPodium}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        {participant ? (
          <Card className="flex flex-row items-center gap-5 rounded-2xl border-border/70 bg-background/75 px-6 py-3.5 text-left shadow-sm backdrop-blur-sm">
            <div>
              <p className="text-muted-foreground text-xs">
                {copy.player.rank}
              </p>
              <p className="font-black font-heading text-2xl text-primary tabular-nums">
                {participantRank || '–'}
              </p>
            </div>
            <div className="h-9 w-px bg-border" aria-hidden="true" />
            <div>
              <p className="text-muted-foreground text-xs">
                {copy.player.score}
              </p>
              <p className="font-black font-heading text-2xl tabular-nums">
                {participant.score.toLocaleString()}
              </p>
            </div>
          </Card>
        ) : null}

        {children ? (
          <div className="flex flex-wrap justify-center gap-3">{children}</div>
        ) : null}
      </div>
    </section>
  );
}
