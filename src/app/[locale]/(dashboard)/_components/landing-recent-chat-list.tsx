'use client';

import { type QueryKey, useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Clock3, type LucideIcon } from 'lucide-react';
import { useLocale } from 'next-intl';
import type { ComponentProps } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Link } from '@/i18n/navigation';

const DEFAULT_RECENT_CHAT_LIMIT = 3;
const RECENT_CHAT_TITLE_MAX_LENGTH = 25;
const RECENT_CHAT_TITLE_MIN_WORD_BOUNDARY = 12;

type RecentChatListParams = {
  limit: number;
  offset: number;
};

type RecentChatListItem = {
  id: string;
  title: string;
  messageCount: number;
  updatedAt: string;
};

type RecentChatListResponse<TChat extends RecentChatListItem> = {
  data: TChat[];
};

type LandingRecentChatListProps<TChat extends RecentChatListItem> = {
  queryKey: QueryKey;
  listChats: (
    params: RecentChatListParams
  ) => Promise<RecentChatListResponse<TChat>>;
  hrefForChat: (chat: TChat) => ComponentProps<typeof Link>['href'];
  icon: LucideIcon;
  title: string;
  description: string;
  errorLabel: string;
  untitledLabel: string;
  getOpenChatLabel: (title: string) => string;
  getMessageCountLabel: (count: number) => string;
  getUpdatedLabel: (date: string) => string;
  limit?: number;
};

function getRecentChatDisplayTitle(title: string) {
  if (title.length <= RECENT_CHAT_TITLE_MAX_LENGTH) return title;

  const preview = title.slice(0, RECENT_CHAT_TITLE_MAX_LENGTH).trim();
  const wordBoundary = preview.lastIndexOf(' ');
  const trimmedPreview =
    wordBoundary >= RECENT_CHAT_TITLE_MIN_WORD_BOUNDARY
      ? preview.slice(0, wordBoundary)
      : preview;

  return `${trimmedPreview} ...`;
}

export function LandingRecentChatList<
  TChat extends RecentChatListItem = RecentChatListItem,
>({
  queryKey,
  listChats,
  hrefForChat,
  icon: Icon,
  title,
  description,
  errorLabel,
  untitledLabel,
  getOpenChatLabel,
  getMessageCountLabel,
  getUpdatedLabel,
  limit = DEFAULT_RECENT_CHAT_LIMIT,
}: LandingRecentChatListProps<TChat>) {
  const locale = useLocale();

  const { data, isLoading, isError } = useQuery({
    queryKey: [...queryKey, limit],
    queryFn: () => listChats({ limit, offset: 0 }),
  });

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: limit }).map((_, index) => (
          <Skeleton className="h-20 rounded-xl" key={index} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="border-border/50 bg-background/50 p-4 text-muted-foreground text-sm">
        {errorLabel}
      </Card>
    );
  }

  if (!data?.data.length) return null;

  return (
    <section className="w-full px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-bold font-heading text-foreground/90 text-lg">
            {title}
          </h2>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
      </div>

      <TooltipProvider>
        <div className="flex flex-col gap-3">
          {data.data.map((chat) => {
            const chatTitle = chat.title || untitledLabel;
            const displayTitle = getRecentChatDisplayTitle(chatTitle);
            const isTitleShortened = displayTitle !== chatTitle;
            const chatCard = (
              <Card className="group flex cursor-pointer flex-row items-center gap-3 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-primary/30">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                  <Icon className="size-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold text-foreground/90 text-sm">
                    {displayTitle}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs">
                    <span>{getMessageCountLabel(chat.messageCount)}</span>
                    <span className="flex items-center gap-1">
                      <Clock3 className="size-3" />
                      {getUpdatedLabel(
                        dateFormatter.format(new Date(chat.updatedAt))
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                  <ArrowUpRight className="size-4" />
                </div>
              </Card>
            );

            if (!isTitleShortened) {
              return (
                <Link
                  aria-label={getOpenChatLabel(chatTitle)}
                  className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  href={hrefForChat(chat)}
                  key={chat.id}
                >
                  {chatCard}
                </Link>
              );
            }

            return (
              <Tooltip key={chat.id}>
                <TooltipTrigger asChild>
                  <Link
                    aria-label={getOpenChatLabel(chatTitle)}
                    className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    href={hrefForChat(chat)}
                  >
                    {chatCard}
                  </Link>
                </TooltipTrigger>
                <TooltipContent
                  align="start"
                  className="max-w-80 text-left leading-relaxed"
                  side="top"
                >
                  {chatTitle}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    </section>
  );
}
