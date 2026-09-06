'use client';

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
import type {
  StudyMode,
  StudyQuizOptions,
} from '@/lib/validations/study.schema';
import { DEFAULT_CHAT_MODEL } from '@/services/ai/chat-provider.constants';
import { useChatSessionStore } from '@/stores/useChatSessionStore';
import type {
  ChatFileUIPart,
  ChatSubmitAttachments,
} from '@/types/chat-attachments';
import type { ChatLessonReferenceUIPart } from '@/types/chat-lesson-references';
import { hasReachedUserMessageLimit } from '@/utils/chat-limit';
import { prepareLastMessageRequest } from '@/utils/chat-request';
import {
  createInitialChatHistoryData,
  mergeChatMessages,
} from '../(ai-chat)/chat-history';
import { uploadChatAttachments } from '../chat-attachments.service';
import { studyService } from './study.service';

// TODO: do we need this because this is not allow the unauthorized user
const MAX_USER_MESSAGES = 5;

type UseStudyOptions = {
  mode: StudyMode;
  quizOptions: StudyQuizOptions;
  chatId?: string;
  initialMessages?: UIMessage[];
  initialMessagesPagination?: {
    hasMore: boolean;
    limit: number;
    nextCursor: string | null;
  };
  isAuthenticated: boolean;
};

export const useStudy = ({
  mode,
  quizOptions,
  chatId,
  initialMessages = [],
  initialMessagesPagination,
  isAuthenticated,
}: UseStudyOptions) => {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const lastPendingSendRef = useRef<string | null>(null);

  const {
    pendingModel,
    pendingChatId,
    pendingMessage,
    setPendingChatId,
    setPendingModel,
    setPendingMessage,
    clearPendingMessage,
    clearPendingChatId,
  } = useChatSessionStore();

  const createSessionMutation = useMutation({
    mutationFn: async (text: string) => {
      const data = await studyService.createChat(
        text,
        mode,
        mode === 'practiceTest' ? quizOptions : undefined
      );
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

  const transport = useMemo(
    () =>
      chatId
        ? new DefaultChatTransport({
            api: `/api/v1/ai/study/${chatId}`,
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
    queryKey: ['study-chat-messages', chatId],
    initialPageParam: undefined as string | undefined,
    enabled: Boolean(chatId),
    initialData: initialHistoryPage
      ? createInitialChatHistoryData(initialHistoryPage)
      : undefined,
    queryFn: ({ pageParam }) =>
      studyService.getChat(chatId as string, {
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
      console.error('Study assistant error:', error);
      toast.error(error.message || 'An error occurred while sending message');
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

  useEffect(() => {
    if (!pendingMessage || !pendingChatId || !chatId) return;
    if (pendingChatId !== chatId) return;
    if (!pathname?.includes(`/study/${pendingChatId}`)) return;

    const pendingKey = `${pendingChatId}:${JSON.stringify(pendingMessage)}`;
    if (lastPendingSendRef.current === pendingKey) return;

    const inputModel = pendingModel;

    lastPendingSendRef.current = pendingKey;
    clearPendingMessage();
    clearPendingChatId();

    sendMessage(pendingMessage, {
      body: {
        mode,
        quizOptions: mode === 'practiceTest' ? quizOptions : undefined,
        provider: 'openrouter',
        model: inputModel,
      },
    });
  }, [
    pendingMessage,
    pendingChatId,
    pendingModel,
    chatId,
    pathname,
    mode,
    sendMessage,
    clearPendingMessage,
    clearPendingChatId,
    quizOptions,
  ]);

  const isLimitReached = isAuthenticated
    ? false
    : hasReachedUserMessageLimit(displayMessages, MAX_USER_MESSAGES);

  const isStreaming = status === 'streaming' || status === 'submitted';

  const startChat = async (
    text: string,
    attachments: ChatSubmitAttachments = { files: [], referencedFiles: [] }
  ) => {
    if (!chatId) {
      try {
        const newChatId = await createSessionMutation.mutateAsync(text);

        const uploadedFiles = await uploadChatAttachments(
          attachments.files,
          newChatId
        );
        const messageFiles = [...uploadedFiles, ...attachments.referencedFiles];
        const messageLessons = attachments.referencedLessons ?? [];

        await queryClient.invalidateQueries({
          queryKey: ['study-chat-list'],
        });
        setPendingMessage(
          createUserMessage(text, messageFiles, messageLessons)
        );
        setPendingChatId(newChatId);
        setPendingModel(pendingModel ?? DEFAULT_CHAT_MODEL);

        router.push(`/study/${newChatId}`);
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to start study session.';
        toast.error(message);
      }
      return;
    }

    const uploadedFiles = await uploadChatAttachments(
      attachments.files,
      chatId
    );
    const messageFiles = [...uploadedFiles, ...attachments.referencedFiles];
    const messageLessons = attachments.referencedLessons ?? [];
    const hasMessageAttachments =
      messageFiles.length > 0 || messageLessons.length > 0;

    sendMessage(
      hasMessageAttachments
        ? createUserMessage(text, messageFiles, messageLessons)
        : { text },
      {
        body: {
          mode,
          quizOptions: mode === 'practiceTest' ? quizOptions : undefined,
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
    maxMessages: MAX_USER_MESSAGES,
    userMessageCount: displayMessages.filter((m) => m.role === 'user').length,
    hasOutput: displayMessages.length > 0,
    pendingModel,
    isStreaming,
    isLimitReached,
    setPendingModel,
    startChat,
    stop,
  };
};
