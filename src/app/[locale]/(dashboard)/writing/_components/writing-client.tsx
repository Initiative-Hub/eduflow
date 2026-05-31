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
import { ChatWorkspaceShell } from '../../_components/chat-workspace-shell';
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

  const viewport = !hasOutput ? (
    <div className="flex flex-col gap-4 px-4 py-6">
      <WritingSelector selected={selectedTool} onSelect={setSelectedTool} />
      <LandingRecentWritingChats />
    </div>
  ) : (
    <ChatView messages={messages} isStreaming={isStreaming} />
  );

  const composer = (
    <ChatInput
      handleSubmit={handleSubmit}
      isAuthenticated={false}
      isStreaming={isStreaming}
      isUploading={false}
      isChatting={hasOutput}
      isLimitReached={isLimitReached}
      limitCount={maxMessages}
      userMessageCount={userMessageCount}
      onStop={stop}
      selectedModel={selectedModel}
      onModelChange={setSelectedModel}
    />
  );

  return (
    <>
      <ChatWorkspaceShell composer={composer} viewport={viewport} />
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
