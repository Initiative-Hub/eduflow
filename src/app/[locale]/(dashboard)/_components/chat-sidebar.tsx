'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import {
  MessageCircle,
  MessageSquare,
  PanelLeftClose,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { chatService } from '../chat.service';

const CHAT_LIST_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

interface ChatSidebarProps {
  currentChatId?: string;
}

export function ChatSidebar({ currentChatId }: ChatSidebarProps) {
  const t = useTranslations('AIChat.sidebar');
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
  }, [search]);

  const chatListQuery = useInfiniteQuery({
    queryKey: ['chat-list', debouncedSearch],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      chatService.listChats({
        search: debouncedSearch,
        limit: CHAT_LIST_PAGE_SIZE,
        offset: pageParam,
      }),
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.pagination.offset + lastPage.pagination.limit;
      return nextOffset < lastPage.pagination.total ? nextOffset : undefined;
    },
  });

  useEffect(() => {
    if (!isOpen) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (
          entry?.isIntersecting &&
          chatListQuery.hasNextPage &&
          !chatListQuery.isFetchingNextPage
        ) {
          void chatListQuery.fetchNextPage();
        }
      },
      { rootMargin: '160px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    isOpen,
    chatListQuery.hasNextPage,
    chatListQuery.isFetchingNextPage,
    chatListQuery.fetchNextPage,
  ]);

  const chats = useMemo(
    () => chatListQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [chatListQuery.data]
  );

  const content = (
    <>
      <Button
        aria-label={isOpen ? t('close') : t('open')}
        className="fixed right-4 bottom-20 z-80 size-12 rounded-full shadow-xl md:right-8 md:bottom-8"
        size="icon-lg"
        type="button"
        onClick={() => setIsOpen((current) => !current)}
      >
        {isOpen ? (
          <X className="size-5" />
        ) : (
          <MessageCircle className="size-5" />
        )}
      </Button>

      {isOpen ? (
        <aside className="fixed top-20 right-3 bottom-36 z-70 flex w-[calc(100vw-1.5rem)] max-w-88 flex-col overflow-hidden rounded-3xl border border-border/70 bg-background/95 shadow-2xl backdrop-blur-xl md:right-8 md:bottom-24 md:max-w-96">
          <div className="flex items-center justify-between border-border/70 border-b px-4 py-3">
            <div>
              <p className="font-semibold text-sm">{t('title')}</p>
              <p className="text-muted-foreground text-xs">
                {t('description')}
              </p>
            </div>
            <Button
              aria-label={t('close')}
              size="icon-sm"
              type="button"
              variant="ghost"
              onClick={() => setIsOpen(false)}
            >
              <PanelLeftClose className="size-4" />
            </Button>
          </div>

          <div className="space-y-3 border-border/70 border-b p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                aria-label={t('searchLabel')}
                className="h-10 rounded-full bg-muted/40 pl-9"
                placeholder={t('searchPlaceholder')}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Button asChild className="h-10 w-full rounded-full">
              <Link href="/">
                <Plus className="size-4" />
                {t('newChat')}
              </Link>
            </Button>
          </div>

          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
            {chatListQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-16 animate-pulse rounded-2xl bg-muted/60"
                  />
                ))}
              </div>
            ) : null}

            {!chatListQuery.isLoading && chats.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed text-center">
                <MessageSquare className="mb-3 size-7 text-muted-foreground" />
                <p className="font-medium text-sm">{t('emptyTitle')}</p>
                <p className="mt-1 max-w-44 text-muted-foreground text-xs">
                  {debouncedSearch ? t('emptySearch') : t('emptyDescription')}
                </p>
              </div>
            ) : null}

            <div className="space-y-1.5">
              {chats.map((chat) => (
                <Button
                  asChild
                  className={cn(
                    'h-auto w-full justify-start rounded-2xl px-3 py-3 text-left',
                    currentChatId === chat.id
                      ? 'bg-primary/10 text-primary hover:bg-primary/15'
                      : 'hover:bg-muted/70'
                  )}
                  key={chat.id}
                  variant="ghost"
                >
                  <Link href={`/chat/${chat.id}`}>
                    <MessageSquare className="mt-0.5 size-4 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-sm">
                        {chat.title || t('untitled')}
                      </span>
                      <span className="block text-muted-foreground text-xs">
                        {t('messageCount', { count: chat.messageCount })}
                      </span>
                    </span>
                  </Link>
                </Button>
              ))}
            </div>

            <div ref={sentinelRef} className="h-8" />
            {chatListQuery.isFetchingNextPage ? (
              <p className="py-2 text-center text-muted-foreground text-xs">
                {t('loadingMore')}
              </p>
            ) : null}
          </div>
        </aside>
      ) : null}
    </>
  );

  return portalRoot ? createPortal(content, portalRoot) : null;
}
