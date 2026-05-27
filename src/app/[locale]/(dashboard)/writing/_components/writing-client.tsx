'use client';

import type { UIMessage } from 'ai';
import { PenLine } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import type React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { WritingTool } from '@/lib/validations/writing.schema';
import { type ChatModel, DEFAULT_CHAT_MODEL } from '@/services/ai/chat-models';
import { ChatInput } from '../../_components/chat-input';
import { ChatSidebar } from '../../_components/chat-sidebar';
import { useWriting } from '../use-writing';
import { writingService } from '../writing.service';
import { LandingRecentWritingChats } from './landing-recent-writing-chats';
import { WritingSelector } from './writing-selector';

interface WritingClientProps {
  chatId?: string;
  initialTool?: WritingTool;
  initialMessages?: UIMessage[];
}

const ChatView = dynamic(() =>
  import('../../_components/chat-view').then((mod) => mod.ChatView)
);

export default function WritingClient({
  chatId,
  initialTool = 'caption',
  initialMessages,
}: WritingClientProps) {
  const [selectedTool, setSelectedTool] = useState<WritingTool>(initialTool);
  const [selectedModel, setSelectedModel] =
    useState<ChatModel>(DEFAULT_CHAT_MODEL);
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
    chatId,
    initialMessages,
    selectedModel,
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

    startChat(text.trim());
  };

  return (
    <>
      <div className="relative flex flex-col items-center gap-8 px-8">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
          <div className="h-125 w-125 rounded-full bg-primary/5 blur-[120px]" />
        </div>

        <div className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center">
          {!hasOutput ? (
            <>
              <WritingSelector
                selected={selectedTool}
                onSelect={setSelectedTool}
              />
              <LandingRecentWritingChats />
            </>
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
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
          />
        </div>
      </div>
      <ChatSidebar
        currentChatId={chatId}
        emptyIcon={PenLine}
        itemIcon={PenLine}
        newSessionHref="/writing"
        queryKey="writing-chat-list"
        sessionHrefPrefix="/writing"
        service={{
          listChats: writingService.listChats,
          updateChat: writingService.updateChat,
        }}
        translationNamespace="WritingPage.sidebar"
      />
    </>
  );
}
