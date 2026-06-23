'use client';

import { useChat } from '@ai-sdk/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DefaultChatTransport } from 'ai';
import { useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { usePathname, useRouter } from '@/i18n/navigation';
import { DEFAULT_SOCRATIC_GUIDANCE_DEPTH } from '@/lib/validations/socratic.schema';
import { DEFAULT_CHAT_MODEL } from '@/services/ai/chat-models';
import { useChatSessionStore } from '@/stores/useChatSessionStore';
import type {
  ChatFileUIPart,
  ChatSubmitAttachments,
} from '@/types/chat-attachments';
import type { SocraticUIMessage } from '@/types/socratic-ui-message';
import { hasReachedUserMessageLimit } from '@/utils/chat-limit';
import { uploadChatAttachments } from '../chat-attachments.service';
import { socraticService } from './socratic.service';

const MAX_USER_MESSAGES = 5;

interface UseSocraticOptions {
  chatId?: string;
  initialMessages?: SocraticUIMessage[];
  isAuthenticated: boolean;
}

export const useSocratic = ({
  chatId,
  initialMessages = [],
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
    setPendingMessage,
    clearPendingMessage,
    setPendingChatId,
    clearPendingChatId,
    setPendingModel,
    setPendingSocraticGuidanceDepth,
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
    generateId: () => crypto.randomUUID(),
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

  const createUserMessage = (
    text: string,
    files: ChatFileUIPart[] = []
  ): SocraticUIMessage => ({
    id: crypto.randomUUID(),
    role: 'user',
    parts: [...files, { type: 'text', text }],
  });

  const pendingForChat =
    pendingChatId && pendingChatId === chatId && pendingMessage
      ? [pendingMessage]
      : [];
  const displayMessages = messages.length > 0 ? messages : pendingForChat;

  useEffect(() => {
    if (!pendingMessage || !pendingChatId || !chatId) return;
    if (pendingChatId !== chatId) return;
    if (!pathname?.includes(`/socratic/${pendingChatId}`)) return;

    const pendingKey = `${pendingChatId}:${JSON.stringify(pendingMessage)}`;
    if (lastPendingSendRef.current === pendingKey) return;

    lastPendingSendRef.current = pendingKey;
    clearPendingMessage();
    clearPendingChatId();

    sendMessage(pendingMessage as SocraticUIMessage, {
      body: {
        guidanceDepth:
          pendingSocraticGuidanceDepth ?? DEFAULT_SOCRATIC_GUIDANCE_DEPTH,
        provider: 'openrouter',
        model: pendingModel ?? DEFAULT_CHAT_MODEL,
      },
    });
  }, [
    pendingMessage,
    pendingChatId,
    pendingModel,
    pendingSocraticGuidanceDepth,
    chatId,
    pathname,
    sendMessage,
    clearPendingMessage,
    clearPendingChatId,
  ]);

  const userMessageCount = displayMessages.filter(
    (message) => message.role === 'user'
  ).length;
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
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['socratic-chat-list'] }),
          queryClient.invalidateQueries({
            queryKey: ['recent-socratic-chats'],
          }),
        ]);
        setPendingMessage(createUserMessage(text, messageFiles));
        setPendingChatId(newChatId);
        setPendingModel(pendingModel ?? DEFAULT_CHAT_MODEL);
        setPendingSocraticGuidanceDepth(
          pendingSocraticGuidanceDepth ?? DEFAULT_SOCRATIC_GUIDANCE_DEPTH
        );

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

    const uploadedFiles = await uploadChatAttachments(
      attachments.files,
      chatId
    );
    const messageFiles = [...uploadedFiles, ...attachments.referencedFiles];

    sendMessage(
      messageFiles.length > 0 ? { text, files: messageFiles } : { text },
      {
        body: {
          provider: 'openrouter',
          model: pendingModel ?? DEFAULT_CHAT_MODEL,
          guidanceDepth:
            pendingSocraticGuidanceDepth ?? DEFAULT_SOCRATIC_GUIDANCE_DEPTH,
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
    pendingSocraticGuidanceDepth,
    isStreaming,
    isLimitReached,
    setPendingModel,
    setPendingSocraticGuidanceDepth,
    startChat,
    stop,
  };
};
