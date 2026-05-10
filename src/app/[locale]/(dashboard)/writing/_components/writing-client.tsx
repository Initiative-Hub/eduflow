'use client';

import type { UIMessage } from 'ai';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import type React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { WritingTool } from '@/lib/validations/writing.schema';
import { ChatInput } from '../../_components/chat-input';
import useWriting from '../use-writing';
import { WritingSelector } from './writing-selector';

interface WritingClientProps {
  sessionId?: string;
  initialMessages?: UIMessage[];
}

//TODO: Understand this
const ChatView = dynamic(() =>
  import('../../_components/chat-view').then((mod) => mod.ChatView)
);

const WritingClient = ({ sessionId, initialMessages }: WritingClientProps) => {
  const [selectedTool, setSelectedTool] = useState<WritingTool>('grammar');
  const t = useTranslations('AIChat');

  const {
    messages,
    isStreaming,
    startChat,
    stop,
    hasOutput,
    isLimitReached,
    maxMessages,
    userMessageCount,
  } = useWriting({
    tool: selectedTool,
    sessionId,
    initialMessages,
  });

  const notifyLimitReached = () => {
    toast.error(t('limitReachedToast', { count: maxMessages }));
  };

  //TODO: FIX IT LATER
  const handleSubmit = (e?: React.FormEvent, customValue?: string) => {
    e?.preventDefault();

    const text = customValue || '';
    if (!text.trim()) return;

    if (isLimitReached) {
      notifyLimitReached();
      return;
    }

    void startChat(text.trim());
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col p-4">
      {!hasOutput && (
        <WritingSelector selected={selectedTool} onSelect={setSelectedTool} />
      )}

      <div className="flex-1 overflow-y-auto">
        {hasOutput && (
          <ChatView messages={messages} isStreaming={isStreaming} />
        )}
      </div>

      <ChatInput
        handleSubmit={handleSubmit}
        isStreaming={isStreaming}
        isChatting={hasOutput}
        isLimitReached={isLimitReached}
        limitCount={maxMessages}
        userMessageCount={userMessageCount}
        onStop={stop}
      />
    </div>
  );
};
export default WritingClient;
