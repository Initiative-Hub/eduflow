'use client';

import { Crown, Trophy, Users } from 'lucide-react';
import type { ComponentProps } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { GameQuizCopy } from './copy';
import type { GameParticipant } from './types';

function initials(displayName: string) {
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function getRankStyle(rank: number) {
  if (rank === 1) {
    return {
      badgeClass:
        'bg-linear-to-br from-amber-400 to-amber-500 text-amber-950 font-black ring-2 ring-amber-400/50 shadow-xs',
      avatarRing: 'ring-2 ring-amber-400/60 shadow-xs',
      scoreClass: 'font-black text-amber-600 dark:text-amber-400 text-base',
      rowClass:
        'bg-amber-500/6 dark:bg-amber-400/6 hover:bg-amber-500/10 dark:hover:bg-amber-400/10',
      nameClass: 'font-bold text-foreground',
      showCrown: true,
    };
  }
  if (rank === 2) {
    return {
      badgeClass:
        'bg-linear-to-br from-slate-200 to-slate-300 text-slate-800 font-bold ring-1 ring-slate-400/40 shadow-xs dark:from-slate-600 dark:to-slate-700 dark:text-slate-100',
      avatarRing: 'ring-2 ring-slate-300 dark:ring-slate-600 shadow-xs',
      scoreClass: 'font-bold text-foreground text-sm sm:text-base',
      rowClass:
        'bg-slate-500/3 dark:bg-slate-400/4 hover:bg-slate-500/7 dark:hover:bg-slate-400/7',
      nameClass: 'font-semibold text-foreground',
      showCrown: false,
    };
  }
  if (rank === 3) {
    return {
      badgeClass:
        'bg-linear-to-br from-amber-600 to-amber-700 text-amber-50 font-bold ring-1 ring-amber-700/40 shadow-xs dark:from-amber-700 dark:to-amber-800 dark:text-amber-100',
      avatarRing: 'ring-2 ring-amber-600/40 dark:ring-amber-700/50 shadow-xs',
      scoreClass: 'font-bold text-foreground text-sm sm:text-base',
      rowClass:
        'bg-amber-700/3 dark:bg-amber-700/4 hover:bg-amber-700/7 dark:hover:bg-amber-700/7',
      nameClass: 'font-semibold text-foreground',
      showCrown: false,
    };
  }
  return {
    badgeClass:
      'bg-muted/80 text-muted-foreground font-semibold ring-1 ring-border/50',
    avatarRing: '',
    scoreClass: 'font-semibold text-muted-foreground text-sm',
    rowClass: 'hover:bg-muted/40',
    nameClass: 'font-medium text-foreground',
    showCrown: false,
  };
}

export function GameQuizFullLeaderboardDialog({
  copy,
  leaderboard,
  triggerClassName,
  triggerSize = 'default',
  triggerVariant = 'default',
}: {
  copy: GameQuizCopy;
  leaderboard: GameParticipant[];
  triggerClassName?: string;
  triggerSize?: ComponentProps<typeof Button>['size'];
  triggerVariant?: ComponentProps<typeof Button>['variant'];
}) {
  const standings = [...leaderboard].sort(
    (first, second) => second.score - first.score
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          className={cn('rounded-full px-4', triggerClassName)}
          size={triggerSize}
          variant={triggerVariant}
        >
          {copy.host.viewFullLeaderboard}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] w-[calc(100%-2rem)] overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b bg-linear-to-b from-primary/8 via-muted/30 to-background px-5 pt-5 pr-12 pb-4 text-left">
          <div className="flex items-center gap-3.5">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-linear-to-br from-amber-400/20 via-amber-500/15 to-amber-600/10 text-amber-600 shadow-xs ring-1 ring-amber-500/25 dark:text-amber-400">
              <Trophy className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="font-bold text-foreground text-lg tracking-tight sm:text-xl">
                {copy.host.fullLeaderboardTitle}
              </DialogTitle>
              <DialogDescription className="mt-1 flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/80 px-2.5 py-0.5 font-medium text-secondary-foreground">
                  <Users className="size-3" aria-hidden="true" />
                  {standings.length} {copy.host.players}
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {standings.length > 0 ? (
          <ScrollArea className="max-h-100">
            <Table className="w-full">
              <TableHeader className="sticky top-0 z-10 border-border/80 border-b bg-background/95 backdrop-blur-xs">
                <TableRow className="border-b hover:bg-transparent">
                  <TableHead className="w-16 pl-5 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                    {copy.player.rank}
                  </TableHead>
                  <TableHead className="text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                    {copy.host.players}
                  </TableHead>
                  <TableHead className="pr-5 text-right font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                    {copy.player.points}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {standings.map((participant, index) => {
                  const rank = index + 1;
                  const style = getRankStyle(rank);

                  return (
                    <TableRow
                      key={participant.id}
                      className={cn('transition-colors', style.rowClass)}
                    >
                      <TableCell className="w-16 pl-5 align-middle">
                        <Badge
                          className={cn(
                            'size-8 justify-center rounded-full p-0 font-bold tabular-nums',
                            style.badgeClass
                          )}
                        >
                          {rank}
                        </Badge>
                      </TableCell>
                      <TableCell className="min-w-0 align-middle">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar
                            className={cn('size-9 shrink-0', style.avatarRing)}
                          >
                            <AvatarImage
                              alt=""
                              src={participant.image ?? undefined}
                            />
                            <AvatarFallback className="font-semibold text-xs">
                              {initials(participant.displayName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex min-w-0 items-center gap-1.5">
                            <span
                              className={cn(
                                'truncate text-sm',
                                style.nameClass
                              )}
                            >
                              {participant.displayName}
                            </span>
                            {style.showCrown ? (
                              <Crown
                                className="size-3.5 shrink-0 fill-amber-500/20 text-amber-500"
                                aria-hidden="true"
                              />
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell
                        className={cn(
                          'pr-5 text-right align-middle tabular-nums',
                          style.scoreClass
                        )}
                      >
                        <span>{participant.score.toLocaleString()}</span>
                        <span className="ml-1 font-normal text-muted-foreground text-xs">
                          {copy.player.pts}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
            <div className="grid size-12 place-items-center rounded-2xl bg-muted/80 text-muted-foreground">
              <Trophy className="size-6 opacity-40" aria-hidden="true" />
            </div>
            <p className="mt-3 font-medium text-muted-foreground text-sm">
              {copy.host.emptyLeaderboard}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
