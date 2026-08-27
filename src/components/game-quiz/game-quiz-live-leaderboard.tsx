import { Crown, Trophy, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatGameQuizRankingProgress, type GameQuizCopy } from './copy';
import type { GameParticipant, GameSessionSnapshot } from './types';

interface GameQuizLiveLeaderboardProps {
  actions?: ReactNode;
  copy: GameQuizCopy;
  session: GameSessionSnapshot;
  variant: 'host' | 'player';
}

function initials(displayName: string) {
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function LeaderboardRow({
  copy,
  isCurrentPlayer = false,
  participant,
  rank,
}: {
  copy: GameQuizCopy;
  isCurrentPlayer?: boolean;
  participant: GameParticipant;
  rank: number;
}) {
  const isFirst = rank === 1;

  return (
    <li
      className={cn(
        'relative flex min-h-17 items-center gap-3 overflow-hidden rounded-2xl border bg-card px-3 py-3 shadow-sm sm:min-h-20 sm:gap-4 sm:px-5',
        isFirst && 'border-primary/25 bg-primary/6 shadow-md',
        isCurrentPlayer &&
          'border-primary/30 bg-primary/10 ring-1 ring-primary/10'
      )}
    >
      <span
        className={cn(
          'absolute inset-y-0 left-0 w-1 bg-border',
          (isFirst || isCurrentPlayer) && 'bg-primary'
        )}
        aria-hidden="true"
      />
      <span
        className={cn(
          'grid size-8 shrink-0 place-items-center rounded-full bg-muted font-bold text-muted-foreground text-sm tabular-nums sm:size-9',
          (isFirst || isCurrentPlayer) && 'bg-primary text-primary-foreground'
        )}
      >
        <span className="sr-only">{copy.player.rank} </span>
        {rank}
      </span>
      <Avatar className="size-10 shrink-0 sm:size-11">
        <AvatarImage alt="" src={participant.image ?? undefined} />
        <AvatarFallback className="bg-muted font-bold text-muted-foreground text-xs">
          {initials(participant.displayName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate font-bold text-foreground text-sm sm:text-base">
            {isCurrentPlayer ? copy.player.you : participant.displayName}
          </span>
          {isFirst ? (
            <Crown
              className="size-4 shrink-0 fill-primary/15 text-primary"
              aria-hidden="true"
            />
          ) : null}
        </div>
        {isCurrentPlayer ? (
          <p className="mt-0.5 font-medium text-primary text-xs">
            {copy.player.keepGoing}
          </p>
        ) : null}
      </div>
      <div className="shrink-0 text-right">
        <p
          className={cn(
            'font-extrabold text-foreground text-lg tabular-nums sm:text-xl',
            (isFirst || isCurrentPlayer) && 'text-primary'
          )}
        >
          {participant.score.toLocaleString()}
        </p>
        <p className="font-semibold text-[0.625rem] text-muted-foreground uppercase tracking-[0.14em]">
          {copy.player.pts}
        </p>
      </div>
    </li>
  );
}

export function GameQuizLiveLeaderboard({
  actions,
  copy,
  session,
  variant,
}: GameQuizLiveLeaderboardProps) {
  const standings = [...session.leaderboard].sort(
    (first, second) => second.score - first.score
  );
  const participantId = session.participant?.id;
  const participantRank = participantId
    ? standings.findIndex((entry) => entry.id === participantId) + 1
    : 0;
  const visibleStandings = standings.slice(0, variant === 'host' ? 5 : 3);
  const pinnedParticipant =
    variant === 'player' && participantRank > visibleStandings.length
      ? standings[participantRank - 1]
      : null;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-background shadow-primary/5 shadow-xl">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-linear-to-b from-primary/10 to-transparent"
        aria-hidden="true"
      />
      <div className="relative px-4 pt-7 pb-5 sm:px-8 sm:pt-9 sm:pb-7">
        <div className="text-center">
          <p className="font-bold text-primary text-xs uppercase tracking-[0.18em]">
            {formatGameQuizRankingProgress(
              copy.player.rankingProgress,
              session.currentRoundIndex + 1,
              session.totalRounds
            )}
          </p>
          <h1 className="mt-2 font-extrabold text-2xl text-foreground tracking-tight sm:text-4xl">
            {copy.player.leaderboard}
          </h1>
          {variant === 'host' ? (
            <Badge
              className="mt-3 gap-1.5 rounded-full px-3 py-1"
              variant="secondary"
            >
              <Users className="size-3.5" aria-hidden="true" />
              {standings.length} {copy.host.players}
            </Badge>
          ) : null}
        </div>

        {visibleStandings.length > 0 ? (
          <ol className="mx-auto mt-7 max-w-2xl space-y-3 sm:mt-9">
            {visibleStandings.map((participant, index) => (
              <LeaderboardRow
                copy={copy}
                isCurrentPlayer={participant.id === participantId}
                key={participant.id}
                participant={participant}
                rank={index + 1}
              />
            ))}
          </ol>
        ) : (
          <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-dashed p-8 text-center">
            <Trophy
              className="mx-auto size-7 text-muted-foreground/50"
              aria-hidden="true"
            />
            <p className="mt-3 text-muted-foreground text-sm">
              {variant === 'host'
                ? copy.host.emptyLeaderboard
                : copy.player.noPodium}
            </p>
          </div>
        )}

        {pinnedParticipant ? (
          <div className="mx-auto mt-7 max-w-2xl border-primary/15 border-t pt-5">
            <ol>
              <LeaderboardRow
                copy={copy}
                isCurrentPlayer
                participant={pinnedParticipant}
                rank={participantRank}
              />
            </ol>
          </div>
        ) : null}

        {actions ? (
          <div className="mx-auto mt-6 flex max-w-2xl flex-col-reverse items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}
