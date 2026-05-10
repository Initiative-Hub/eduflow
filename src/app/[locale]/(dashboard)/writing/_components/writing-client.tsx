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

const ChatView = dynamic(() =>
  import('../../_components/chat-view').then((mod) => mod.ChatView)
);

const WritingClient = ({ sessionId, initialMessages }: WritingClientProps) => {
  const [selectedTool, setSelectedTool] = useState<WritingTool>('caption');
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

  const handleSubmit = (e?: React.SyntheticEvent, customValue?: string) => {
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
    <div className="relative flex h-full flex-1 flex-col items-center overflow-x-hidden px-4 py-8 md:px-0">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <div className="h-125 w-125 rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center overflow-hidden">
        {!hasOutput ? (
          <WritingSelector selected={selectedTool} onSelect={setSelectedTool} />
        ) : (
          <div className="mx-auto flex h-full w-full max-w-4xl flex-col">
            <div className="flex-1 overflow-y-auto">
              <ChatView messages={messages} isStreaming={isStreaming} />
            </div>
          </div>
        )}
      </div>

      <div className="mx-auto w-full max-w-4xl">
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
    </div>
  );
};
export default WritingClient;
