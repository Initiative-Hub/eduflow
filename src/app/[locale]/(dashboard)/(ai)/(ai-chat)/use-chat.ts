'use client';

import { useChat } from '@ai-sdk/react';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { usePathname, useRouter } from '@/i18n/navigation';
import { DEFAULT_CHAT_MODEL } from '@/services/ai/chat-provider.constants';
import { useChatSessionStore } from '@/stores/useChatSessionStore';
import type {
  ChatFileUIPart,
  ChatSubmitAttachments,
} from '@/types/chat-attachments';
import type { ChatLessonReferenceUIPart } from '@/types/chat-lesson-references';
import {
  getUserMessageCount,
  hasReachedUserMessageLimit,
} from '@/utils/chat-limit';
import { prepareLastMessageRequest } from '@/utils/chat-request';
import { uploadChatAttachments } from '../chat-attachments.service';
import { chatService } from './chat.service';
import {
  createInitialChatHistoryData,
  mergeChatMessages,
} from './chat-history';

const MAX_USER_MESSAGES = 5;

interface UseChatControllerOptions {
  chatId?: string;
  initialMessages?: UIMessage[];
  initialMessagesPagination?: {
    hasMore: boolean;
    limit: number;
    nextCursor: string | null;
  };
  isAuthenticated: boolean;
}

export const useChatController = ({
  chatId: initialChatId,
  initialMessages = [],
  initialMessagesPagination,
  isAuthenticated,
}: UseChatControllerOptions) => {
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
  } = useChatSessionStore();

  const transport = useMemo(
    () =>
      initialChatId
        ? new DefaultChatTransport({
            api: `/api/v1/ai/chat/${initialChatId}`,
            prepareSendMessagesRequest: prepareLastMessageRequest,
          })
        : undefined,
    [initialChatId]
  );

  const initialHistoryPage = useMemo(
    () =>
      initialChatId
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
    [initialChatId, initialMessages, initialMessagesPagination]
  );

  const historyQuery = useInfiniteQuery({
    queryKey: ['chat-messages', initialChatId],
    initialPageParam: undefined as string | undefined,
    enabled: Boolean(initialChatId),
    initialData: initialHistoryPage
      ? createInitialChatHistoryData(initialHistoryPage)
      : undefined,
    queryFn: ({ pageParam }) =>
      chatService.getChat(initialChatId as string, {
        limit: initialMessagesPagination?.limit ?? 5,
        before: pageParam,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? lastPage.pagination.nextCursor : undefined,
  });

  const { messages, status, sendMessage, stop } = useChat({
    id: initialChatId,
    messages: initialMessages,
    generateId: () => `${crypto.randomUUID()}`,
    transport,
    onError(error) {
      console.error('Chat error:', error);
      toast.error(
        error.message || 'An error occurred while sending the message.'
      );
    },
  });

  const [optimisticMessage, setOptimisticMessage] = useState<UIMessage | null>(
    null
  );
  const [isStartingChat, setIsStartingChat] = useState(false);

  const pendingForChat =
    pendingChatId && pendingChatId === initialChatId && pendingMessage
      ? [pendingMessage]
      : [];
  const baseLiveMessages = messages.length > 0 ? messages : pendingForChat;
  const liveMessages =
    optimisticMessage && !messages.some((m) => m.id === optimisticMessage.id)
      ? [...baseLiveMessages, optimisticMessage]
      : baseLiveMessages;
  const displayMessages = initialChatId
    ? mergeChatMessages(historyQuery.data?.pages, liveMessages)
    : liveMessages;
  const userMessageCount = getUserMessageCount(displayMessages);
  const isLimitReached = isAuthenticated
    ? false
    : hasReachedUserMessageLimit(displayMessages, MAX_USER_MESSAGES);
  const isStreaming =
    status === 'streaming' || status === 'submitted' || isStartingChat;

  useEffect(() => {
    if (!pendingMessage || !pendingChatId || !initialChatId) return;
    if (pendingChatId !== initialChatId) return;
    if (!pathname?.includes(`/chat/${pendingChatId}`)) return;

    const pendingKey = `${pendingChatId}:${JSON.stringify(pendingMessage)}`;
    if (lastPendingSendRef.current === pendingKey) return;

    lastPendingSendRef.current = pendingKey;
    clearPendingMessage();
    clearPendingChatId();

    sendMessage(pendingMessage, {
      body: {
        provider: 'openrouter',
        model: pendingModel ?? DEFAULT_CHAT_MODEL,
      },
    });
  }, [
    clearPendingChatId,
    clearPendingMessage,
    pendingMessage,
    pendingChatId,
    pendingModel,
    initialChatId,
    pathname,
    sendMessage,
  ]);

  const createChatMutation = useMutation({
    mutationFn: async (text: string) => {
      const data = await chatService.createChat(text);
      return data.chatId;
    },
  });

  const createUserMessage = (
    text: string,
    files: ChatFileUIPart[] = [],
    lessons: ChatLessonReferenceUIPart[] = []
  ): UIMessage => ({
    id: crypto.randomUUID(),
    role: 'user',
    parts: [...files, ...lessons, { type: 'text', text }],
  });

  const createOptimisticFilePart = (file: File): ChatFileUIPart => ({
    bucket: null,
    fileId: crypto.randomUUID(),
    fileSize: file.size,
    filename: file.name,
    mediaType: file.type,
    objectKey: null,
    type: 'file',
    url: typeof window !== 'undefined' ? URL.createObjectURL(file) : '',
  });

  const startChat = async (
    text: string,
    attachments: ChatSubmitAttachments = { files: [], referencedFiles: [] }
  ) => {
    if (isStartingChat) return;

    const optimisticFiles: ChatFileUIPart[] = [
      ...attachments.files.map(createOptimisticFilePart),
      ...attachments.referencedFiles,
    ];
    const messageLessons = attachments.referencedLessons ?? [];
    const optimisticUserMessage = createUserMessage(
      text,
      optimisticFiles,
      messageLessons
    );

    if (!initialChatId) {
      // 1. Update UI first: show user message and thinking indicator immediately
      setOptimisticMessage(optimisticUserMessage);
      setIsStartingChat(true);

      try {
        const newChatId = await createChatMutation.mutateAsync(text);
        const uploadedFiles = await uploadChatAttachments(
          attachments.files,
          newChatId
        );
        const messageFiles = [...uploadedFiles, ...attachments.referencedFiles];
        const finalMessage = createUserMessage(
          text,
          messageFiles,
          messageLessons
        );

        await queryClient.invalidateQueries({ queryKey: ['chat-list'] });

        setPendingMessage(finalMessage);
        setPendingChatId(newChatId);
        setPendingModel(pendingModel ?? DEFAULT_CHAT_MODEL);

        router.push(`/chat/${newChatId}`);
      } catch (error) {
        setOptimisticMessage(null);
        setIsStartingChat(false);
        const message =
          error instanceof Error ? error.message : 'Unable to start chat.';
        toast.error(message);
        throw error;
      }
      return;
    }

    if (attachments.files.length > 0) {
      setOptimisticMessage(optimisticUserMessage);
      setIsStartingChat(true);

      try {
        const uploadedFiles = await uploadChatAttachments(
          attachments.files,
          initialChatId
        );
        const messageFiles = [...uploadedFiles, ...attachments.referencedFiles];
        const finalMessage = createUserMessage(
          text,
          messageFiles,
          messageLessons
        );
        setOptimisticMessage(null);
        setIsStartingChat(false);

        sendMessage(finalMessage, {
          body: {
            provider: 'openrouter',
            model: pendingModel ?? DEFAULT_CHAT_MODEL,
          },
        });
      } catch (error) {
        setOptimisticMessage(null);
        setIsStartingChat(false);
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to upload attachments.';
        toast.error(message);
        throw error;
      }
      return;
    }

    const messageFiles = attachments.referencedFiles;
    const hasMessageAttachments =
      messageFiles.length > 0 || messageLessons.length > 0;

    sendMessage(
      hasMessageAttachments
        ? createUserMessage(text, messageFiles, messageLessons)
        : { text },
      {
        body: {
          provider: 'openrouter',
          model: pendingModel ?? DEFAULT_CHAT_MODEL,
        },
      }
    );
  };

  const stopChat = () => {
    if (isStartingChat) {
      setIsStartingChat(false);
      setOptimisticMessage(null);
    }
    stop();
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
    stop: stopChat,
  };
};
