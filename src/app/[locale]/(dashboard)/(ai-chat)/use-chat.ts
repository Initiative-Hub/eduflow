'use client';

import { useChat } from '@ai-sdk/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { usePathname, useRouter } from '@/i18n/navigation';
import type { ChatModel } from '@/services/ai/chat-models';
import { useChatSessionStore } from '@/stores/useChatSessionStore';
import type { ChatFileUIPart } from '@/types/chat-attachments';
import {
  getUserMessageCount,
  hasReachedUserMessageLimit,
} from '@/utils/chat-limit';
import { chatService } from './chat.service';

const MAX_USER_MESSAGES = 5;

interface UseChatControllerOptions {
  chatId?: string;
  initialMessages?: UIMessage[];
  isAuthenticated: boolean;
  selectedModel: ChatModel;
}

export const useChatController = ({
  chatId: initialChatId,
  initialMessages = [],
  isAuthenticated,
  selectedModel,
}: UseChatControllerOptions) => {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const lastPendingSendRef = useRef<string | null>(null);
  const {
    pendingMessage,
    pendingFiles,
    pendingChatId,
    pendingModel,
    optimisticChatId,
    optimisticMessages,
    setPendingMessage,
    clearPendingMessage,
    setPendingFiles,
    clearPendingFiles,
    setPendingChatId,
    clearPendingChatId,
    setPendingModel,
    clearPendingModel,
    setOptimisticChatId,
    setOptimisticMessages,
    clearOptimisticMessages,
  } = useChatSessionStore();

  const transport = useMemo(
    () =>
      initialChatId
        ? new DefaultChatTransport({
            api: `/api/v1/ai/chat/${initialChatId}`,
          })
        : undefined,
    [initialChatId]
  );

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

  const optimisticForChat =
    optimisticChatId && optimisticChatId === initialChatId
      ? optimisticMessages
      : [];
  const displayMessages = messages.length > 0 ? messages : optimisticForChat;
  const userMessageCount = getUserMessageCount(displayMessages);
  const isLimitReached = isAuthenticated
    ? false
    : hasReachedUserMessageLimit(displayMessages, MAX_USER_MESSAGES);
  const isStreaming = status === 'streaming' || status === 'submitted';

  useEffect(() => {
    if (!pendingMessage || !pendingChatId || !initialChatId) return;
    if (pendingChatId !== initialChatId) return;
    if (!pathname?.includes(`/chat/${pendingChatId}`)) return;

    const pendingFileIds = pendingFiles.map((file) => file.fileId).join(',');
    const pendingKey = `${pendingChatId}:${pendingMessage}:${pendingFileIds}`;
    if (lastPendingSendRef.current === pendingKey) return;

    const inputModel = pendingModel ?? selectedModel;

    lastPendingSendRef.current = pendingKey;
    clearPendingMessage();
    clearPendingFiles();
    clearPendingChatId();
    clearPendingModel();

    sendMessage(
      pendingFiles.length > 0
        ? { text: pendingMessage, files: pendingFiles }
        : { text: pendingMessage },
      {
        body: {
          provider: 'openrouter',
          model: inputModel,
        },
      }
    );
  }, [
    clearPendingChatId,
    clearPendingFiles,
    clearPendingModel,
    clearPendingMessage,
    pendingMessage,
    pendingFiles,
    pendingChatId,
    pendingModel,
    initialChatId,
    pathname,
    selectedModel,
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

  const createUserMessage = (
    text: string,
    files: ChatFileUIPart[] = []
  ): UIMessage => ({
    id: `msg_${crypto.randomUUID()}`,
    role: 'user',
    parts: [...files, { type: 'text', text }],
  });

  const startChat = async (text: string, files: ChatFileUIPart[] = []) => {
    if (!initialChatId) {
      try {
        const newChatId = await createChatMutation.mutateAsync(text);
        await queryClient.invalidateQueries({ queryKey: ['chat-list'] });
        setOptimisticChatId(newChatId);
        setOptimisticMessages([createUserMessage(text, files)]);
        setPendingMessage(text);
        setPendingFiles(files);
        setPendingChatId(newChatId);
        setPendingModel(selectedModel);
        router.push(`/chat/${newChatId}`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to start chat.';
        toast.error(message);
      }
      return;
    }

    sendMessage(files.length > 0 ? { text, files } : { text }, {
      body: {
        provider: 'openrouter',
        model: selectedModel,
      },
    });
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
