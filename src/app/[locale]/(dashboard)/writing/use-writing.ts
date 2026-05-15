import { useChat } from '@ai-sdk/react';
import { useMutation } from '@tanstack/react-query';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { usePathname, useRouter } from '@/i18n/navigation';
import type { WritingTool } from '@/lib/validations/writing.schema';
import { useChatSessionStore } from '@/stores/useChatSessionStore';
import {
  getUserMessageCount,
  hasReachedUserMessageLimit,
} from '@/utils/chat-limit';
import { writingService } from './writing.service';

const MAX_USER_MESSAGES = 5;

interface UseWritingOptions {
  tool: WritingTool;
  sessionId?: string;
  initialMessages?: UIMessage[];
}

const useWriting = ({
  tool,
  sessionId,
  initialMessages = [],
}: UseWritingOptions) => {
  const router = useRouter();
  const pathname = usePathname();
  const lastPendingSendRef = useRef<string | null>(null);

  const {
    pendingMessage,
    pendingChatId,
    setOptimisticChatId,
    setOptimisticMessages,
    setPendingMessage,
    setPendingChatId,
    optimisticChatId,
    optimisticMessages,
    clearPendingMessage,
    clearPendingChatId,
    clearOptimisticMessages,
  } = useChatSessionStore();

  const createSessionMutation = useMutation({
    mutationFn: async (text: string) => {
      const data = await writingService.createSession(text, tool);
      return data.sessionId;
    },
  });

  const createUserMessage = (text: string): UIMessage => ({
    id: `msg_${crypto.randomUUID()}`,
    role: 'user',
    parts: [{ type: 'text', text }],
  });

  const transport = useMemo(
    () =>
      sessionId
        ? new DefaultChatTransport({
            api: `/api/v1/ai/writing/${sessionId}`,
            body: {
              tool,
              provider: 'openrouter',
              model: 'gemini-2.5-pro',
            },
          })
        : undefined,
    [sessionId, tool]
  );

  const { messages, status, sendMessage, stop } = useChat({
    id: sessionId,
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
    optimisticChatId && optimisticChatId === sessionId
      ? optimisticMessages
      : [];
  const displayMessages = messages.length > 0 ? messages : optimisticForChat;

  useEffect(() => {
    if (!pendingMessage || !pendingChatId || !sessionId) return;
    if (pendingChatId !== sessionId) return;
    if (!pathname?.includes(`/writing/${pendingChatId}`)) return;

    const pendingKey = `${pendingChatId}:${pendingMessage}`;
    if (lastPendingSendRef.current === pendingKey) return;

    lastPendingSendRef.current = pendingKey;
    clearPendingMessage();
    clearPendingChatId();

    void sendMessage({ text: pendingMessage });
  }, [
    pendingMessage,
    pendingChatId,
    sessionId,
    pathname,
    sendMessage,
    clearPendingMessage,
    clearPendingChatId,
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
    if (!sessionId) {
      try {
        const newChatId = await createSessionMutation.mutateAsync(text);
        setOptimisticChatId(newChatId);
        setOptimisticMessages([createUserMessage(text)]);
        setPendingMessage(text);
        setPendingChatId(newChatId);

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
