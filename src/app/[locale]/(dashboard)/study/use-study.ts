'use client';

import { useChat } from '@ai-sdk/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { usePathname, useRouter } from '@/i18n/navigation';
import type { StudyMode } from '@/lib/validations/study.schema';
import type { ChatModel } from '@/services/ai/chat-models';
import { useChatSessionStore } from '@/stores/useChatSessionStore';
import type { ChatFileUIPart } from '@/types/chat-attachments';
import { hasReachedUserMessageLimit } from '@/utils/chat-limit';
import { uploadChatAttachments } from '../(ai-chat)/chat-attachments.service';
import { studyService } from './study.service';

// TODO: do we need this because this is not allow the unauthorized user
const MAX_USER_MESSAGES = 5;

type UseStudyOptions = {
  mode: StudyMode;
  chatId?: string;
  initialMessages?: UIMessage[];
  selectedModel: ChatModel;
  isAuthenticated: boolean;
};

export const useStudy = ({
  mode,
  chatId,
  initialMessages = [],
  selectedModel,
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
    clearPendingModel,
  } = useChatSessionStore();

  const createSessionMutation = useMutation({
    mutationFn: async (text: string) => {
      const data = await studyService.createChat(text, mode);
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

  const transport = useMemo(
    () =>
      chatId
        ? new DefaultChatTransport({
            api: `/api/v1/ai/study/${chatId}`,
          })
        : undefined,
    [chatId]
  );

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

  const displayMessages = messages.length > 0 ? messages : pendingForChat;

  useEffect(() => {
    if (!pendingMessage || !pendingChatId || !chatId) return;
    if (pendingChatId !== chatId) return;
    if (!pathname?.includes(`/study/${pendingChatId}`)) return;

    const pendingKey = `${pendingChatId}:${JSON.stringify(pendingMessage)}`;
    if (lastPendingSendRef.current === pendingKey) return;

    const inputModel = pendingModel ?? selectedModel;

    lastPendingSendRef.current = pendingKey;
    clearPendingMessage();
    clearPendingChatId();
    clearPendingModel();

    sendMessage(pendingMessage, {
      body: {
        mode,
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
    selectedModel,
    mode,
    sendMessage,
    clearPendingMessage,
    clearPendingChatId,
    clearPendingModel,
  ]);

  const isLimitReached = isAuthenticated
    ? false
    : hasReachedUserMessageLimit(displayMessages, MAX_USER_MESSAGES);

  const isStreaming = status === 'streaming' || status === 'submitted';

  const startChat = async (text: string, files: File[] = []) => {
    if (!chatId) {
      try {
        const newChatId = await createSessionMutation.mutateAsync(text);

        const uploadedFiles = await uploadChatAttachments(files, newChatId);

        await queryClient.invalidateQueries({
          queryKey: ['study-chat-list'],
        });
        setPendingMessage(createUserMessage(text, uploadedFiles));
        setPendingChatId(newChatId);
        setPendingModel(selectedModel);

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

    const uploadedFiles = await uploadChatAttachments(files, chatId);

    sendMessage(
      uploadedFiles.length > 0 ? { text, files: uploadedFiles } : { text },
      {
        body: {
          mode,
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
    userMessageCount: displayMessages.filter((m) => m.role === 'user').length,
  };
};
