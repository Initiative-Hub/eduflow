import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { GameParticipant } from './types';

type PodiumPlace = 'first' | 'second' | 'third';

const PLACE_STYLES: Record<
  PodiumPlace,
  {
    avatar: string;
    badge: string;
    column: string;
    fallback: string;
    pedestal: string;
    rank: string;
  }
> = {
  first: {
    avatar:
      'size-20 border-4 border-amber-400 bg-background shadow-lg shadow-amber-500/15 sm:size-28',
    badge:
      'border-amber-400/50 text-amber-700 dark:border-amber-300/40 dark:text-amber-300',
    column: 'z-20 max-w-36 sm:max-w-52',
    fallback: 'text-xl text-amber-700 dark:text-amber-300',
    pedestal:
      'h-36 w-28 border-amber-400/35 bg-amber-100/65 sm:h-44 sm:w-48 dark:border-amber-300/25 dark:bg-amber-300/10',
    rank: 'text-5xl text-amber-400/70 sm:text-6xl dark:text-amber-300/70',
  },
  second: {
    avatar:
      'size-16 border-3 border-muted-foreground/30 bg-background shadow-md sm:size-24',
    badge: 'border-border text-muted-foreground',
    column: 'z-10 max-w-32 sm:max-w-48',
    fallback: 'text-lg text-foreground',
    pedestal: 'h-28 w-24 border-border bg-muted/75 sm:h-36 sm:w-44',
    rank: 'text-4xl text-muted-foreground/55 sm:text-5xl',
  },
  third: {
    avatar:
      'size-16 border-3 border-amber-700/35 bg-background shadow-md sm:size-24 dark:border-amber-500/40',
    badge:
      'border-amber-700/25 text-amber-800 dark:border-amber-400/30 dark:text-amber-300',
    column: 'z-10 max-w-32 sm:max-w-48',
    fallback: 'text-lg text-amber-800 dark:text-amber-300',
    pedestal:
      'h-24 w-24 border-amber-700/20 bg-amber-700/10 sm:h-32 sm:w-44 dark:border-amber-400/20 dark:bg-amber-400/10',
    rank: 'text-4xl text-amber-700/65 dark:text-amber-300/80',
  },
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

export function GameQuizPodiumPlace({
  participant,
  place,
  pointsLabel,
}: {
  participant: GameParticipant;
  place: PodiumPlace;
  pointsLabel: string;
}) {
  const rank = place === 'first' ? 1 : place === 'second' ? 2 : 3;
  const styles = PLACE_STYLES[place];

  return (
    <div
      className={cn(
        'flex min-w-0 flex-1 flex-col items-center text-center',
        styles.column
      )}
    >
      <Badge
        variant="outline"
        className={cn(
          'mb-2.5 rounded-full bg-background px-2.5 py-0.5 font-bold text-[0.6875rem] shadow-xs sm:text-xs',
          styles.badge
        )}
      >
        #{rank}
      </Badge>

      <div>
        <Avatar className={styles.avatar}>
          <AvatarImage alt="" src={participant.image ?? undefined} />
          <AvatarFallback
            className={cn('font-bold font-heading', styles.fallback)}
          >
            {initials(participant.displayName)}
          </AvatarFallback>
        </Avatar>
      </div>

      <p
        className="mt-3 w-full truncate px-1 font-bold font-heading text-foreground text-sm sm:text-base"
        title={participant.displayName}
      >
        {participant.displayName}
      </p>
      <p className="mt-0.5 mb-3 font-bold text-[0.625rem] text-primary uppercase tracking-[0.12em] sm:text-xs">
        {participant.score.toLocaleString()} {pointsLabel}
      </p>

      <div
        className={cn(
          'flex items-start justify-center rounded-t-2xl border-x border-t pt-6 shadow-sm sm:pt-7',
          styles.pedestal
        )}
      >
        <span
          className={cn(
            'font-black font-heading tabular-nums leading-none',
            styles.rank
          )}
        >
          {rank}
        </span>
      </div>
    </div>
  );
}
