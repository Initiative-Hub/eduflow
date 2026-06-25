'use client';

import { useChat } from '@ai-sdk/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { usePathname, useRouter } from '@/i18n/navigation';
import { DEFAULT_CHAT_MODEL } from '@/services/ai/chat-models';
import { useChatSessionStore } from '@/stores/useChatSessionStore';
import type {
  ChatFileUIPart,
  ChatSubmitAttachments,
} from '@/types/chat-attachments';
import {
  getUserMessageCount,
  hasReachedUserMessageLimit,
} from '@/utils/chat-limit';
import { prepareLastMessageRequest } from '@/utils/chat-request';
import { uploadChatAttachments } from '../chat-attachments.service';
import { chatService } from './chat.service';

const MAX_USER_MESSAGES = 5;

interface UseChatControllerOptions {
  chatId?: string;
  initialMessages?: UIMessage[];
  isAuthenticated: boolean;
}

export const useChatController = ({
  chatId: initialChatId,
  initialMessages = [],
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

  const pendingForChat =
    pendingChatId && pendingChatId === initialChatId && pendingMessage
      ? [pendingMessage]
      : [];
  const displayMessages = messages.length > 0 ? messages : pendingForChat;
  const userMessageCount = getUserMessageCount(displayMessages);
  const isLimitReached = isAuthenticated
    ? false
    : hasReachedUserMessageLimit(displayMessages, MAX_USER_MESSAGES);
  const isStreaming = status === 'streaming' || status === 'submitted';

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
    files: ChatFileUIPart[] = []
  ): UIMessage => ({
    id: crypto.randomUUID(),
    role: 'user',
    parts: [...files, { type: 'text', text }],
  });

  const startChat = async (
    text: string,
    attachments: ChatSubmitAttachments = { files: [], referencedFiles: [] }
  ) => {
    if (!initialChatId) {
      try {
        const newChatId = await createChatMutation.mutateAsync(text);
        const uploadedFiles = await uploadChatAttachments(
          attachments.files,
          newChatId
        );
        const messageFiles = [...uploadedFiles, ...attachments.referencedFiles];
        await queryClient.invalidateQueries({ queryKey: ['chat-list'] });
        setPendingMessage(createUserMessage(text, messageFiles));
        setPendingChatId(newChatId);
        setPendingModel(pendingModel ?? DEFAULT_CHAT_MODEL);
        router.push(`/chat/${newChatId}`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to start chat.';
        toast.error(message);
      }
      return;
    }

    const uploadedFiles = await uploadChatAttachments(
      attachments.files,
      initialChatId
    );
    const messageFiles = [...uploadedFiles, ...attachments.referencedFiles];

    sendMessage(
      messageFiles.length > 0 ? { text, files: messageFiles } : { text },
      {
        body: {
          provider: 'openrouter',
          model: pendingModel ?? DEFAULT_CHAT_MODEL,
        },
      }
    );
  };

  return {
    messages: displayMessages,
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
