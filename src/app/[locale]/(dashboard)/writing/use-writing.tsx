import { useChat } from '@ai-sdk/react';
import { useMutation } from '@tanstack/react-query';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useMemo } from 'react';
import { toast } from 'sonner';
import { useRouter } from '@/i18n/navigation';
import type { WritingTool } from '@/lib/validations/writing.schema';
import { useChatSessionStore } from '@/stores/useChatSessionStore';
import { writingService } from './writing.service';

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

  //TODO: not understand this
  const {
    setOptimisticChatId,
    setOptimisticMessages,
    setPendingMessage,
    setPendingChatId,
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
            api: `/api/writing/${sessionId}`,
            body: {
              provider: 'openrouter',
              model: 'gemini-2.5-pro',
            },
          })
        : undefined,
    [sessionId]
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

  const isStreaming = status === 'streaming' || status === 'submitted';

  const startWriting = async (text: string) => {
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
    messages,
    isStreaming,
    startWriting,
    stop,
    hasOutput: messages.length > 0,
  };
};
export default useWriting;
