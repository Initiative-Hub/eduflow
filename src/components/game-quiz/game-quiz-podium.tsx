import type { ReactNode } from 'react';
import { Medal, Trophy } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { cn } from '@/lib/utils';
import type { GameQuizCopy } from './copy';
import type { GameParticipant, GameSessionSnapshot } from './types';

type PodiumParticipant = GameParticipant & { rank: number };

const podiumPlacementStyles: Record<number, string> = {
  1: 'min-h-72 border-primary-foreground/60 bg-primary-foreground text-primary shadow-2xl md:-translate-y-8',
  2: 'min-h-56 border-primary-foreground/35 bg-primary-foreground/15',
  3: 'min-h-48 border-primary-foreground/25 bg-primary-foreground/10',
};

function initials(displayName: string) {
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function podiumParticipants(leaderboard: GameParticipant[]) {
  const ranked = leaderboard.slice(0, 3).map((participant, index) => ({
    ...participant,
    rank: index + 1,
  }));

  return [ranked[1], ranked[0], ranked[2]].filter(
    (participant): participant is PodiumParticipant => Boolean(participant)
  );
}

function PodiumPlacement({
  copy,
  participant,
}: {
  copy: GameQuizCopy;
  participant: PodiumParticipant;
}) {
  const winner = participant.rank === 1;
  return (
    <li
      className={cn(
        'flex flex-col items-center justify-end border px-5 py-6 text-center shadow-lg',
        podiumPlacementStyles[participant.rank]
      )}
    >
      {winner ? (
        <Trophy className="mb-3 size-7" aria-label={copy.host.podium} />
      ) : (
        <Medal className="mb-3 size-6" aria-hidden="true" />
      )}
      <Avatar className="size-20">
        <AvatarImage alt="" src={participant.image ?? undefined} />
        <AvatarFallback>{initials(participant.displayName)}</AvatarFallback>
      </Avatar>
      <p className="mt-4 text-sm opacity-75">
        {copy.player.rank} {participant.rank}
      </p>
      <p className="mt-1 max-w-full truncate font-semibold text-xl">
        {participant.displayName}
      </p>
      <p className="mt-2 font-semibold text-lg tabular-nums">
        {participant.score}
      </p>
    </li>
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
  const podium = podiumParticipants(session.leaderboard);
  const participantRank = participant
    ? session.leaderboard.findIndex((entry) => entry.id === participant.id) + 1
    : 0;

  return (
    <section className="relative overflow-hidden bg-primary px-4 py-10 text-primary-foreground sm:px-8 sm:py-14">
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
        <span className="absolute top-8 left-[12%] size-3 rotate-12 bg-primary-foreground/30 motion-safe:animate-bounce" />
        <span className="absolute top-20 right-[16%] size-2 rotate-45 bg-primary-foreground/40 motion-safe:animate-bounce" />
        <span className="absolute right-[30%] bottom-12 size-4 -rotate-12 bg-primary-foreground/20 motion-safe:animate-bounce" />
      </div>
      <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center gap-8 text-center">
        <div>
          <p className="font-medium text-primary-foreground/75 text-sm uppercase tracking-[0.2em]">
            {session.gameTitle}
          </p>
          <h1 className="mt-2 font-semibold text-3xl sm:text-4xl">{title}</h1>
        </div>

        {podium.length > 0 ? (
          <ol className="grid w-full items-end gap-4 md:grid-cols-3">
            {podium.map((entry) => (
              <PodiumPlacement copy={copy} key={entry.id} participant={entry} />
            ))}
          </ol>
        ) : (
          <Empty className="border-primary-foreground/35 bg-primary-foreground/10 text-primary-foreground">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Trophy aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>{title}</EmptyTitle>
              <EmptyDescription className="text-primary-foreground/75">
                {copy.player.noPodium}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        {participant ? (
          <div className="border border-primary-foreground/35 bg-primary-foreground/10 px-5 py-4">
            <p className="text-primary-foreground/75 text-sm">
              {copy.player.rank} {participantRank || '–'}
            </p>
            <p className="mt-1 font-semibold text-2xl tabular-nums">
              {participant.score}
            </p>
            <p className="text-primary-foreground/75 text-sm">
              {copy.player.score}
            </p>
          </div>
        ) : null}

        {children ? (
          <div className="flex flex-wrap justify-center gap-3">{children}</div>
        ) : null}
      </div>
    </section>
  );
}
