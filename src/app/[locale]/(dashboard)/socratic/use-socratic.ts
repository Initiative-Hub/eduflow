'use client';

import { useChat } from '@ai-sdk/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DefaultChatTransport } from 'ai';
import { useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { usePathname, useRouter } from '@/i18n/navigation';
import type { SocraticGuidanceDepth } from '@/lib/validations/socratic.schema';
import type { ChatModel } from '@/services/ai/chat-models';
import { useChatSessionStore } from '@/stores/useChatSessionStore';
import type { SocraticUIMessage } from '@/types/socratic-ui-message';
import { hasReachedUserMessageLimit } from '@/utils/chat-limit';
import { socraticService } from './socratic.service';

const MAX_USER_MESSAGES = 5;

interface UseSocraticOptions {
  chatId?: string;
  initialMessages?: SocraticUIMessage[];
  selectedModel: ChatModel;
  guidanceDepth: SocraticGuidanceDepth;
  isAuthenticated: boolean;
}

export const useSocratic = ({
  chatId,
  initialMessages = [],
  selectedModel,
  guidanceDepth,
  isAuthenticated,
}: UseSocraticOptions) => {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const lastPendingSendRef = useRef<string | null>(null);

  const {
    pendingMessage,
    pendingChatId,
    pendingModel,
    pendingSocraticGuidanceDepth,
    optimisticChatId,
    optimisticMessages,
    setOptimisticChatId,
    setOptimisticMessages,
    setPendingMessage,
    setPendingChatId,
    setPendingModel,
    setPendingSocraticGuidanceDepth,
    clearPendingMessage,
    clearPendingChatId,
    clearPendingModel,
    clearPendingSocraticGuidanceDepth,
    clearOptimisticMessages,
  } = useChatSessionStore();

  const transport = useMemo(
    () =>
      chatId
        ? new DefaultChatTransport({
            api: `/api/v1/ai/socratic/${chatId}`,
          })
        : undefined,
    [chatId]
  );

  const { messages, status, sendMessage, stop } = useChat<SocraticUIMessage>({
    id: chatId,
    messages: initialMessages,
    transport,
    onError(error) {
      console.error('Socratic tutor error:', error);
      toast.error(
        error.message || 'An error occurred while sending the message.'
      );
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: async (text: string) => {
      const data = await socraticService.createChat(text);
      return data.chatId;
    },
  });

  const createUserMessage = (text: string): SocraticUIMessage => ({
    id: `msg_${crypto.randomUUID()}`,
    role: 'user',
    parts: [{ type: 'text', text }],
  });

  const optimisticForChat =
    optimisticChatId && optimisticChatId === chatId
      ? (optimisticMessages as SocraticUIMessage[])
      : [];
  const displayMessages = messages.length > 0 ? messages : optimisticForChat;

  useEffect(() => {
    if (!pendingMessage || !pendingChatId || !chatId) return;
    if (pendingChatId !== chatId) return;
    if (!pathname?.includes(`/socratic/${pendingChatId}`)) return;

    const pendingKey = `${pendingChatId}:${pendingMessage}`;
    if (lastPendingSendRef.current === pendingKey) return;

    const inputModel = pendingModel ?? selectedModel;
    const inputGuidanceDepth = pendingSocraticGuidanceDepth ?? guidanceDepth;

    lastPendingSendRef.current = pendingKey;
    clearPendingMessage();
    clearPendingChatId();
    clearPendingModel();
    clearPendingSocraticGuidanceDepth();

    sendMessage(
      { text: pendingMessage },
      {
        body: {
          guidanceDepth: inputGuidanceDepth,
          provider: 'openrouter',
          model: inputModel,
        },
      }
    );
  }, [
    pendingMessage,
    pendingChatId,
    pendingModel,
    pendingSocraticGuidanceDepth,
    chatId,
    pathname,
    selectedModel,
    guidanceDepth,
    sendMessage,
    clearPendingMessage,
    clearPendingChatId,
    clearPendingModel,
    clearPendingSocraticGuidanceDepth,
  ]);

  useEffect(() => {
    if (messages.length === 0 || optimisticMessages.length === 0) return;
    clearOptimisticMessages();
    setOptimisticChatId(null);
  }, [
    messages.length,
    optimisticMessages.length,
    clearOptimisticMessages,
    setOptimisticChatId,
  ]);

  const userMessageCount = displayMessages.filter(
    (message) => message.role === 'user'
  ).length;
  const isLimitReached = isAuthenticated
    ? false
    : hasReachedUserMessageLimit(displayMessages, MAX_USER_MESSAGES);
  const isStreaming = status === 'streaming' || status === 'submitted';

  const startChat = async (text: string) => {
    if (!chatId) {
      try {
        const newChatId = await createSessionMutation.mutateAsync(text);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['socratic-chat-list'] }),
          queryClient.invalidateQueries({
            queryKey: ['recent-socratic-chats'],
          }),
        ]);
        setOptimisticChatId(newChatId);
        setOptimisticMessages([createUserMessage(text)]);
        setPendingMessage(text);
        setPendingChatId(newChatId);
        setPendingModel(selectedModel);
        setPendingSocraticGuidanceDepth(guidanceDepth);

        router.push(`/socratic/${newChatId}`);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to start Socratic session.';
        toast.error(message);
      }
      return;
    }

    sendMessage(
      { text },
      {
        body: {
          guidanceDepth,
          provider: 'openrouter',
          model: selectedModel,
        },
      }
    );
  };

  return {
    messages: displayMessages,
    startChat,
    isStreaming,
    stop,
    hasOutput: displayMessages.length > 0,
    isLimitReached,
    maxMessages: MAX_USER_MESSAGES,
    userMessageCount,
  };
};
