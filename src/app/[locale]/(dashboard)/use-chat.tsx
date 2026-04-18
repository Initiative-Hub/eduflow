'use client';

import { useChat } from '@ai-sdk/react';
import { useMutation } from '@tanstack/react-query';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useChatSessionStore } from '@/stores/useChatSessionStore';
import {
  getUserMessageCount,
  hasReachedUserMessageLimit,
} from '@/utils/chat-limit';
import { chatService } from './chat.service';

const MAX_USER_MESSAGES = 5;

interface UseChatControllerOptions {
  chatId?: string;
}

export const useChatController = ({
  chatId: initialChatId,
}: UseChatControllerOptions) => {
  const router = useRouter();
  const pathname = usePathname();
  const lastPendingSendRef = useRef<string | null>(null);
  const {
    pendingMessage,
    pendingChatId,
    optimisticChatId,
    optimisticMessages,
    setPendingMessage,
    clearPendingMessage,
    setPendingChatId,
    clearPendingChatId,
    setOptimisticChatId,
    setOptimisticMessages,
    clearOptimisticMessages,
  } = useChatSessionStore();

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: initialChatId ? { chatId: initialChatId } : undefined,
      }),
    [initialChatId]
  );

  const chatOptions = initialChatId ? { id: initialChatId } : {};

  const { messages, status, sendMessage, stop } = useChat({
    ...chatOptions,
    transport,
    onError(error) {
      console.error('Chat error:', error);
      toast.error(
        error.message || 'An error occurred while sending the message.'
      );
    },
  });

  const optimisticForChat =
    optimisticChatId && optimisticChatId === initialChatId
      ? optimisticMessages
      : [];
  const displayMessages = messages.length > 0 ? messages : optimisticForChat;
  const userMessageCount = getUserMessageCount(displayMessages);
  const isLimitReached = hasReachedUserMessageLimit(
    displayMessages,
    MAX_USER_MESSAGES
  );
  const isStreaming = status === 'streaming' || status === 'submitted';

  useEffect(() => {
    if (!pendingMessage || !pendingChatId || !initialChatId) return;
    if (pendingChatId !== initialChatId) return;
    if (!pathname?.includes(`/chat/${pendingChatId}`)) return;

    const pendingKey = `${pendingChatId}:${pendingMessage}`;
    if (lastPendingSendRef.current === pendingKey) return;

    lastPendingSendRef.current = pendingKey;
    clearPendingMessage();
    clearPendingChatId();

    void sendMessage({ text: pendingMessage });
  }, [
    clearPendingChatId,
    clearPendingMessage,
    pendingMessage,
    pendingChatId,
    initialChatId,
    pathname,
    sendMessage,
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

  const createChatMutation = useMutation({
    mutationFn: async (text: string) => {
      const data = await chatService.createChat(text);
      return data.chatId;
    },
  });

  const createUserMessage = (text: string): UIMessage => ({
    id: `msg_${crypto.randomUUID()}`,
    role: 'user',
    parts: [{ type: 'text', text }],
  });

  const startChat = async (text: string) => {
    if (!initialChatId) {
      try {
        const newChatId = await createChatMutation.mutateAsync(text);
        setOptimisticChatId(newChatId);
        setOptimisticMessages([createUserMessage(text)]);
        setPendingMessage(text);
        setPendingChatId(newChatId);
        router.push(`/chat/${newChatId}`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to start chat.';
        toast.error(message);
      }
      return;
    }

    void sendMessage({ text });
  };

  return {
    displayMessages,
    isStreaming,
    isChatting: displayMessages.length > 0,
    isLimitReached,
    userMessageCount,
    startChat,
    stop,
    maxMessages: MAX_USER_MESSAGES,
  };
};
