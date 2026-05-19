import { useChat } from '@ai-sdk/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { usePathname, useRouter } from '@/i18n/navigation';
import type { WritingTool } from '@/lib/validations/writing.schema';
import type { ChatModel } from '@/services/ai/chat-models';
import { useChatSessionStore } from '@/stores/useChatSessionStore';
import { hasReachedUserMessageLimit } from '@/utils/chat-limit';
import { writingService } from './writing.service';

const MAX_USER_MESSAGES = 5;

interface UseWritingOptions {
  tool: WritingTool;
  chatId?: string;
  initialMessages?: UIMessage[];
  selectedModel: ChatModel;
}

const useWriting = ({
  tool,
  chatId,
  initialMessages = [],
  selectedModel,
}: UseWritingOptions) => {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const lastPendingSendRef = useRef<string | null>(null);

  const {
    pendingMessage,
    pendingChatId,
    pendingModel,
    setOptimisticChatId,
    setOptimisticMessages,
    setPendingMessage,
    setPendingChatId,
    setPendingModel,
    optimisticChatId,
    optimisticMessages,
    clearPendingMessage,
    clearPendingChatId,
    clearPendingModel,
    clearOptimisticMessages,
  } = useChatSessionStore();
  const requestModel = pendingModel ?? selectedModel;

  const createSessionMutation = useMutation({
    mutationFn: async (text: string) => {
      const data = await writingService.createChat(text, tool);
      return data.chatId;
    },
  });

  const createUserMessage = (text: string): UIMessage => ({
    id: `msg_${crypto.randomUUID()}`,
    role: 'user',
    parts: [{ type: 'text', text }],
  });

  const transport = useMemo(
    () =>
      chatId
        ? new DefaultChatTransport({
            api: `/api/v1/ai/writing/${chatId}`,
            body: {
              tool,
              provider: 'openrouter',
              model: requestModel,
            },
          })
        : undefined,
    [chatId, requestModel, tool]
  );

  const { messages, status, sendMessage, stop } = useChat({
    id: chatId,
    messages: initialMessages,
    transport,
    onError(error) {
      console.error('Chat error:', error);
      toast.error(
        error.message || 'An error occurred while sending the message.'
      );
    },
  });

  const optimisticForChat =
    optimisticChatId && optimisticChatId === chatId ? optimisticMessages : [];
  const displayMessages = messages.length > 0 ? messages : optimisticForChat;

  useEffect(() => {
    if (!pendingMessage || !pendingChatId || !chatId) return;
    if (pendingChatId !== chatId) return;
    if (!pathname?.includes(`/writing/${pendingChatId}`)) return;

    const pendingKey = `${pendingChatId}:${pendingMessage}`;
    if (lastPendingSendRef.current === pendingKey) return;

    lastPendingSendRef.current = pendingKey;
    clearPendingMessage();
    clearPendingChatId();
    clearPendingModel();

    void sendMessage({ text: pendingMessage });
  }, [
    pendingMessage,
    pendingChatId,
    chatId,
    pathname,
    sendMessage,
    clearPendingMessage,
    clearPendingChatId,
    clearPendingModel,
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
        setOptimisticChatId(newChatId);
        setOptimisticMessages([createUserMessage(text)]);
        setPendingMessage(text);
        setPendingChatId(newChatId);
        setPendingModel(selectedModel);

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

    void sendMessage({ text });
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
export default useWriting;
