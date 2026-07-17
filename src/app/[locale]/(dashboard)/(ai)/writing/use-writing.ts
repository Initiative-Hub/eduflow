import { useChat } from '@ai-sdk/react';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { usePathname, useRouter } from '@/i18n/navigation';
import type { WritingTool } from '@/lib/validations/writing.schema';
import { DEFAULT_CHAT_MODEL } from '@/services/ai/chat-models';
import { useChatSessionStore } from '@/stores/useChatSessionStore';
import {
  getUserMessageCount,
  hasReachedUserMessageLimit,
} from '@/utils/chat-limit';
import { prepareLastMessageRequest } from '@/utils/chat-request';
import {
  createInitialChatHistoryData,
  mergeChatMessages,
} from '../(ai-chat)/chat-history';
import { writingService } from './writing.service';

const MAX_USER_MESSAGES = 5;

interface UseWritingOptions {
  tool: WritingTool;
  chatId?: string;
  initialMessages?: UIMessage[];
  initialMessagesPagination?: {
    hasMore: boolean;
    limit: number;
    nextCursor: string | null;
  };
}

export const useWriting = ({
  tool,
  chatId,
  initialMessages = [],
  initialMessagesPagination,
}: UseWritingOptions) => {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const lastPendingSendRef = useRef<string | null>(null);

  const {
    pendingMessage,
    pendingChatId,
    pendingModel,
    setPendingMessage,
    clearPendingMessage,
    setPendingChatId,
    clearPendingChatId,
    setPendingModel,
    clearPendingModel,
  } = useChatSessionStore();

  const createSessionMutation = useMutation({
    mutationFn: async (text: string) => {
      const data = await writingService.createChat(text, tool);
      return data.chatId;
    },
  });

  const createUserMessage = (text: string): UIMessage => ({
    id: crypto.randomUUID(),
    role: 'user',
    parts: [{ type: 'text', text }],
  });

  const transport = useMemo(
    () =>
      chatId
        ? new DefaultChatTransport({
            api: `/api/v1/ai/writing/${chatId}`,
            prepareSendMessagesRequest: prepareLastMessageRequest,
          })
        : undefined,
    [chatId]
  );

  const initialHistoryPage = useMemo(
    () =>
      chatId
        ? {
            title: '',
            messageCount: initialMessages.length,
            messages: initialMessages,
            pagination: initialMessagesPagination ?? {
              hasMore: false,
              limit: initialMessages.length,
              nextCursor: null,
            },
          }
        : null,
    [chatId, initialMessages, initialMessagesPagination]
  );

  const historyQuery = useInfiniteQuery({
    queryKey: ['writing-chat-messages', chatId],
    initialPageParam: undefined as string | undefined,
    enabled: Boolean(chatId),
    initialData: initialHistoryPage
      ? createInitialChatHistoryData(initialHistoryPage)
      : undefined,
    queryFn: ({ pageParam }) =>
      writingService.getChat(chatId as string, {
        limit: initialMessagesPagination?.limit ?? 5,
        before: pageParam,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? lastPage.pagination.nextCursor : undefined,
  });

  const { messages, status, sendMessage, stop } = useChat({
    id: chatId,
    messages: initialMessages,
    generateId: () => crypto.randomUUID(),
    transport,
    onError(error) {
      console.error('Chat error:', error);
      toast.error(
        error.message || 'An error occurred while sending the message.'
      );
    },
  });

  const pendingForChat =
    pendingChatId && pendingChatId === chatId && pendingMessage
      ? [pendingMessage]
      : [];
  const liveMessages = messages.length > 0 ? messages : pendingForChat;
  const displayMessages = chatId
    ? mergeChatMessages(historyQuery.data?.pages, liveMessages)
    : liveMessages;
  const userMessageCount = getUserMessageCount(displayMessages);

  useEffect(() => {
    if (!pendingMessage || !pendingChatId || !chatId) return;
    if (pendingChatId !== chatId) return;
    if (!pathname?.includes(`/writing/${pendingChatId}`)) return;

    const pendingKey = `${pendingChatId}:${JSON.stringify(pendingMessage)}`;
    if (lastPendingSendRef.current === pendingKey) return;

    lastPendingSendRef.current = pendingKey;
    clearPendingMessage();
    clearPendingChatId();
    clearPendingModel();

    sendMessage(pendingMessage, {
      body: {
        tool,
        provider: 'openrouter',
        model: pendingModel ?? DEFAULT_CHAT_MODEL,
      },
    });
  }, [
    pendingMessage,
    pendingChatId,
    pendingModel,
    chatId,
    pathname,
    tool,
    sendMessage,
    clearPendingMessage,
    clearPendingChatId,
    clearPendingModel,
  ]);

  const isLimitReached = hasReachedUserMessageLimit(
    displayMessages,
    MAX_USER_MESSAGES
  );

  const isStreaming = status === 'streaming' || status === 'submitted';

  const startChat = async (text: string) => {
    if (!chatId) {
      try {
        const newChatId = await createSessionMutation.mutateAsync(text);
        await queryClient.invalidateQueries({
          queryKey: ['writing-chat-list'],
        });
        setPendingMessage(createUserMessage(text));
        setPendingChatId(newChatId);
        setPendingModel(pendingModel ?? DEFAULT_CHAT_MODEL);

        router.push(`/writing/${newChatId}`);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to start writing session.';
        toast.error(message);
      }
      return;
    }

    sendMessage(
      { text },
      {
        body: {
          tool,
          provider: 'openrouter',
          model: pendingModel ?? DEFAULT_CHAT_MODEL,
        },
      }
    );
  };

  return {
    messages: displayMessages,
    hasOlderMessages: historyQuery.hasNextPage,
    isLoadingOlderMessages: historyQuery.isFetchingNextPage,
    loadOlderMessages: historyQuery.fetchNextPage,
    userMessageCount,
    maxMessages: MAX_USER_MESSAGES,
    hasOutput: displayMessages.length > 0,
    pendingModel,
    isStreaming,
    isLimitReached,
    setPendingModel,
    startChat,
    stop,
  };
};
