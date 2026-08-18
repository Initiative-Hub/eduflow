'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { GameQuizOption } from './types';

type Answerer = NonNullable<GameQuizOption['answerers']>[number];

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
}: {
  answerers: Answerer[];
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
        <Tooltip disableHoverableContent>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="relative rounded-full ring-2 ring-background focus-visible:outline-none focus-visible:ring-ring"
              aria-label={`${remaining.length} more respondents`}
            >
              <Avatar className="border-background bg-muted">
                <AvatarFallback>+{remaining.length}</AvatarFallback>
              </Avatar>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="block animate-none! p-2">
            <ScrollArea className="max-h-48 w-56">
              <div className="space-y-2 pr-3">
                {remaining.map((answerer) => (
                  <div key={answerer.id} className="flex items-center gap-2">
                    <RespondentAvatar answerer={answerer} small />
                    <span>{answerer.displayName}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}
