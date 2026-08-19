'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Answerer } from './types';

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function RespondentAvatar({
  answerer,
  small = false,
}: {
  answerer: Answerer;
  small?: boolean;
}) {
  return (
    <Avatar
      size={small ? 'sm' : 'default'}
      className="border-background bg-muted"
    >
      {answerer.image ? <AvatarImage src={answerer.image} alt="" /> : null}
      <AvatarFallback>{initials(answerer.displayName)}</AvatarFallback>
    </Avatar>
  );
}

export function GameQuizRespondentStack({
  answerers,
  moreRespondentsLabels,
}: {
  answerers: Answerer[];
  moreRespondentsLabels: { one: string; other: string };
}) {
  const visible = answerers.slice(0, 2);
  const remaining = answerers.slice(2);

  return (
    <div className="flex -space-x-2" data-testid="respondent-stack">
      {visible.map((answerer) => (
        <Tooltip key={answerer.id} disableHoverableContent>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="relative rounded-full ring-2 ring-background focus-visible:outline-none focus-visible:ring-ring"
              aria-label={answerer.displayName}
            >
              <RespondentAvatar answerer={answerer} />
            </button>
          </TooltipTrigger>
          <TooltipContent className="animate-none!" side="top">
            {answerer.displayName}
          </TooltipContent>
        </Tooltip>
      ))}
      {remaining.length > 0 ? (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="relative rounded-full ring-2 ring-background focus-visible:outline-none focus-visible:ring-ring"
              aria-label={`${remaining.length} ${
                remaining.length === 1
                  ? moreRespondentsLabels.one
                  : moreRespondentsLabels.other
              }`}
            >
              <Avatar className="border-background bg-muted">
                <AvatarFallback>+{remaining.length}</AvatarFallback>
              </Avatar>
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" className="w-60 p-0">
            <ScrollArea className="h-48">
              <div className="space-y-4 p-2">
                {remaining.map((answerer) => (
                  <div key={answerer.id} className="flex items-center gap-2">
                    <RespondentAvatar answerer={answerer} small />
                    <span>{answerer.displayName}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
}
