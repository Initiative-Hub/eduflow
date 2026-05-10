'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  Ellipsis,
  Loader2,
  MessageCircle,
  MessageSquare,
  PanelLeftClose,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Link, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { chatService } from '../chat.service';

const CHAT_LIST_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

interface ChatSidebarProps {
  currentChatId?: string;
}

export function ChatSidebar({ currentChatId }: ChatSidebarProps) {
  const t = useTranslations('AIChat.sidebar');
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [editingChat, setEditingChat] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [deleteChat, setDeleteChat] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const sentinelRef = useRef<HTMLDivElement | null>(null);

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

  const updateChatMutation = useMutation({
    mutationFn: ({ chatId, title }: { chatId: string; title: string }) =>
      chatService.updateChat(chatId, { title }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['chat-list'] });
      setEditingChat(null);
      setEditTitle('');
    },
    onError: () => {
      toast.error(t('editError'));
    },
  });

  const deleteChatMutation = useMutation({
    mutationFn: (chatId: string) =>
      chatService.updateChat(chatId, { deleted_at: new Date().toISOString() }),
    onSuccess: async (_data, chatId) => {
      await queryClient.invalidateQueries({ queryKey: ['chat-list'] });
      toast.success(t('deleteSuccess'));
      setDeleteChat(null);

      if (currentChatId === chatId) {
        router.push('/');
      }
    },
    onError: () => {
      toast.error(t('deleteError'));
    },
  });

  const openEditDialog = (chat: { id: string; title: string }) => {
    const title = chat.title || t('untitled');
    setEditingChat({ id: chat.id, title });
    setEditTitle(title);
  };

  const handleEditSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingChat) return;

    const title = editTitle.trim();
    if (!title) return;

    updateChatMutation.mutate({ chatId: editingChat.id, title });
  };

  return (
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
        <aside className="fixed top-20 right-3 bottom-36 z-50 flex w-[calc(100vw-1.5rem)] max-w-88 flex-col overflow-hidden rounded-3xl border border-border/70 bg-background/95 shadow-2xl backdrop-blur-xl md:right-8 md:bottom-24 md:max-w-96">
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
                <div
                  className={cn(
                    'group flex items-center rounded-2xl pr-1',
                    currentChatId === chat.id
                      ? 'bg-primary/10 text-primary hover:bg-primary/15'
                      : 'hover:bg-muted/70'
                  )}
                  key={chat.id}
                >
                  <Link
                    className="flex min-w-0 flex-1 items-start gap-2 px-3 py-3 text-left"
                    href={`/chat/${chat.id}`}
                  >
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        aria-label={t('actionsLabel', {
                          title: chat.title || t('untitled'),
                        })}
                        className="shrink-0 opacity-80 group-hover:opacity-100"
                        size="icon-sm"
                        type="button"
                        variant="ghost"
                      >
                        <Ellipsis />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="z-70 w-40">
                      <DropdownMenuGroup>
                        <DropdownMenuItem onSelect={() => openEditDialog(chat)}>
                          <Pencil />
                          {t('editTitle')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() =>
                            setDeleteChat({
                              id: chat.id,
                              title: chat.title || t('untitled'),
                            })
                          }
                        >
                          <Trash2 />
                          {t('delete')}
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
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

      <Dialog
        open={Boolean(editingChat)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingChat(null);
            setEditTitle('');
          }
        }}
      >
        <DialogContent>
          <form className="flex flex-col gap-4" onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>{t('editDialogTitle')}</DialogTitle>
              <DialogDescription>
                {t('editDialogDescription')}
              </DialogDescription>
            </DialogHeader>
            <Input
              value={editTitle}
              aria-label={t('editTitleLabel')}
              maxLength={120}
              placeholder={t('editTitlePlaceholder')}
              onChange={(event) => setEditTitle(event.target.value)}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingChat(null)}
              >
                {t('cancel')}
              </Button>
              <Button
                disabled={!editTitle.trim() || updateChatMutation.isPending}
                type="submit"
              >
                {updateChatMutation.isPending ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : (
                  <Pencil data-icon="inline-start" />
                )}
                {t('saveTitle')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteChat)}
        onOpenChange={(open) => {
          if (!open) setDeleteChat(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteDialogTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDialogDescription', {
                title: deleteChat?.title ?? t('untitled'),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteChatMutation.isPending}
              variant="destructive"
              onClick={() => {
                if (deleteChat) deleteChatMutation.mutate(deleteChat.id);
              }}
            >
              {deleteChatMutation.isPending ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <Trash2 data-icon="inline-start" />
              )}
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
