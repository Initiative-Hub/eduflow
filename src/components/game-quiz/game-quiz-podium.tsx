'use client';

import { Award, Trophy } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import ReactConfetti from 'react-confetti';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import type { GameQuizCopy } from './copy';
import type { GameParticipant, GameSessionSnapshot } from './types';

function initials(displayName: string) {
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

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
    ? session.leaderboard.findIndex((entry) => entry.id === participant.id) + 1
    : 0;

  return (
    <section className="relative overflow-hidden px-4 py-8 text-foreground sm:py-12">
      <CelebrationConfetti />
      <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center gap-6 text-center">
        {/* Header Section */}
        <div>
          <h1 className="font-extrabold text-3xl text-purple-600 sm:text-4xl dark:text-purple-400">
            {title}
          </h1>
          <p className="mt-1 font-medium text-slate-600 text-sm sm:text-base dark:text-slate-400">
            {copy.host.congratulationsDescription}
          </p>
          <Award
            className="mx-auto mt-3 size-10 text-amber-500"
            aria-hidden="true"
          />
        </div>

        {/* Podium Backdrop Container */}
        {leaderboard.length > 0 ? (
          <div className="mx-auto w-full max-w-2xl rounded-3xl bg-linear-to-b from-purple-100/40 via-purple-50/20 to-transparent p-6 sm:p-10 dark:from-purple-950/20">
            <ol className="flex items-end justify-center gap-3 sm:gap-6">
              {/* 2nd Place (Left Column) */}
              {second ? (
                <li className="flex flex-col items-center">
                  <Avatar className="size-16 border-3 border-slate-300 shadow-xs sm:size-20 dark:border-slate-600">
                    <AvatarImage alt="" src={second.image ?? undefined} />
                    <AvatarFallback className="font-bold text-lg text-slate-700">
                      {initials(second.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <p className="mt-2 mb-3 max-w-24 truncate font-extrabold text-primary-foreground text-xs sm:max-w-28 sm:text-sm">
                    {second.displayName}
                  </p>
                  <div className="flex h-32 w-20 items-center justify-center rounded-t-2xl border-slate-200 border-t-2 bg-linear-to-b from-slate-100 via-slate-50 to-slate-50/40 shadow-xs sm:h-40 sm:w-28 dark:border-slate-700 dark:from-slate-800/60 dark:to-slate-900/30">
                    <span className="font-extrabold text-4xl text-slate-300 sm:text-5xl dark:text-slate-600">
                      2
                    </span>
                  </div>
                </li>
              ) : null}

              {/* 1st Place (Center Column - Winner) */}
              {first ? (
                <li className="flex flex-col items-center">
                  <Badge
                    variant="outline"
                    className="mb-2.5 rounded-full border-purple-100 bg-card px-3 py-1 font-extrabold text-purple-600 text-xs shadow-xs sm:text-sm dark:border-purple-900 dark:text-purple-300"
                  >
                    {first.score.toLocaleString()} {copy.player.pts}
                  </Badge>
                  <Avatar className="size-20 border-4 border-amber-500 shadow-md sm:size-24">
                    <AvatarImage alt="" src={first.image ?? undefined} />
                    <AvatarFallback className="font-bold text-amber-600 text-xl">
                      {initials(first.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <p className="mt-2 mb-3 max-w-28 truncate font-extrabold text-purple-600 text-sm sm:max-w-36 sm:text-base dark:text-purple-300">
                    {first.displayName}
                  </p>
                  <div className="flex h-44 w-24 items-center justify-center rounded-t-2xl border-purple-300 border-t-2 bg-linear-to-b from-purple-200/90 via-purple-100/60 to-purple-50/30 shadow-xs sm:h-52 sm:w-32 dark:border-purple-700 dark:from-purple-900/60 dark:to-purple-950/30">
                    <span className="font-extrabold text-5xl text-amber-500 sm:text-6xl">
                      1
                    </span>
                  </div>
                </li>
              ) : null}

              {/* 3rd Place (Right Column) */}
              {third ? (
                <li className="flex flex-col items-center">
                  <Avatar className="size-16 border-3 border-amber-600/50 shadow-xs sm:size-20 dark:border-amber-700/60">
                    <AvatarImage alt="" src={third.image ?? undefined} />
                    <AvatarFallback className="font-bold text-amber-800 text-lg">
                      {initials(third.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <p className="mt-2 mb-3 max-w-24 truncate font-extrabold text-slate-800 text-xs sm:max-w-28 sm:text-sm dark:text-slate-200">
                    {third.displayName}
                  </p>
                  <div className="flex h-24 w-20 items-center justify-center rounded-t-2xl border-amber-200/80 border-t-2 bg-linear-to-b from-amber-100/70 via-amber-50/40 to-amber-50/10 shadow-xs sm:h-32 sm:w-28 dark:border-amber-900/60 dark:from-amber-950/40 dark:to-amber-950/10">
                    <span className="font-extrabold text-3xl text-amber-600/70 sm:text-4xl dark:text-amber-500/70">
                      3
                    </span>
                  </div>
                </li>
              ) : null}
            </ol>
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

        {/* Player Personal Rank Summary Card */}
        {participant ? (
          <Card className="px-6 py-4 text-center shadow-xs">
            <p className="text-muted-foreground text-sm">
              {copy.player.rank} {participantRank || '–'}
            </p>
            <p className="mt-1 font-extrabold text-2xl tabular-nums">
              {participant.score.toLocaleString()}
            </p>
            <p className="text-muted-foreground text-sm">{copy.player.score}</p>
          </Card>
        ) : null}

        {/* Action Buttons Container */}
        {children ? (
          <div className="mt-4 flex flex-wrap justify-center gap-4">
            {children}
          </div>
        ) : null}
      </div>
    </section>
  );
}
