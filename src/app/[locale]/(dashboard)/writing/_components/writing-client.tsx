'use client';

import { useTranslations } from 'next-intl';
import type React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { WritingTool } from '@/lib/validations/writing.schema';
import { ChatInput } from '../../_components/chat-input';
import useWriting from '../use-writing';

const WritingClient = () => {
  const [selectedTool, setSelectedTool] = useState<WritingTool>('grammar');
  const t = useTranslations('AIChat');

  const {
    isStreaming,
    startChat,
    stop,
    hasOutput,
    isLimitReached,
    maxMessages,
    userMessageCount,
  } = useWriting({
    tool: selectedTool,
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
    <div className="">
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
