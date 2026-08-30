import { Crown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { GameParticipant } from './types';

type PodiumPlace = 'first' | 'second' | 'third';

const PLACE_STYLES: Record<
  PodiumPlace,
  {
    avatar: string;
    column: string;
    fallback: string;
    name: string;
    pedestal: string;
    rank: string;
    score: string;
  }
> = {
  first: {
    avatar:
      'size-20 border-4 border-amber-400 bg-background shadow-lg shadow-amber-500/15 sm:size-24',
    column: 'z-20 max-w-36 sm:max-w-44',
    fallback: 'text-xl text-amber-700 dark:text-amber-300',
    name: 'text-primary sm:text-base',
    pedestal:
      'h-44 w-24 border-primary/25 bg-linear-to-b from-primary/25 via-primary/12 to-primary/5 shadow-[0_-20px_60px_-40px_var(--primary)] sm:h-52 sm:w-32',
    rank: 'text-5xl text-primary sm:text-6xl',
    score: 'border-primary/20 text-primary',
  },
  second: {
    avatar:
      'size-16 border-3 border-muted-foreground/30 bg-background shadow-md sm:size-20',
    column: 'z-10 max-w-32 sm:max-w-40',
    fallback: 'text-lg text-foreground',
    name: 'text-foreground',
    pedestal:
      'h-32 w-20 border-border bg-linear-to-b from-muted via-card/80 to-muted/35 sm:h-40 sm:w-28',
    rank: 'text-4xl text-muted-foreground/55 sm:text-5xl',
    score: 'border-border text-foreground',
  },
  third: {
    avatar:
      'size-16 border-3 border-amber-700/35 bg-background shadow-md sm:size-20 dark:border-amber-500/40',
    column: 'z-10 max-w-32 sm:max-w-40',
    fallback: 'text-lg text-amber-800 dark:text-amber-300',
    name: 'text-foreground',
    pedestal:
      'h-24 w-20 border-amber-700/15 bg-linear-to-b from-amber-500/14 via-amber-500/7 to-amber-500/3 sm:h-32 sm:w-28 dark:border-amber-400/20',
    rank: 'text-4xl text-amber-700/65 dark:text-amber-300/80',
    score: 'border-amber-700/15 text-foreground dark:border-amber-400/20',
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
          'mb-3 rounded-full bg-background/85 px-2.5 py-1 font-bold text-[0.6875rem] shadow-sm backdrop-blur-sm sm:px-3 sm:text-xs',
          styles.score
        )}
      >
        {participant.score.toLocaleString()} {pointsLabel}
      </Badge>

      <div className="relative">
        {place === 'first' ? (
          <span className="absolute -top-5 left-1/2 z-10 grid size-8 -translate-x-1/2 place-items-center rounded-full bg-amber-400 text-amber-950 shadow-md ring-4 ring-background/80">
            <Crown className="size-4" aria-hidden="true" />
          </span>
        ) : null}
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
        className={cn(
          'my-3 w-full truncate px-1 font-bold font-heading text-xs sm:text-sm',
          styles.name
        )}
        title={participant.displayName}
      >
        {participant.displayName}
      </p>

      <div
        className={cn(
          'flex items-start justify-center rounded-t-3xl border-x border-t pt-7 shadow-sm sm:pt-8',
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
