'use client';

import type { UIMessage } from 'ai';
import { PenLine } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import type React from 'react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { useActiveQuizAttempts } from '@/hooks/use-active-quiz-attempts';
import type { WritingTool } from '@/lib/validations/writing.schema';
import { DEFAULT_CHAT_MODEL } from '@/services/ai/chat-provider.constants';
import { ChatInput } from '../../_components/chat-input';
import { ChatShareButton } from '../../_components/chat-share-button';
import { ChatSidebar } from '../../_components/chat-sidebar';
import { ChatWorkspaceShell } from '../../_components/chat-workspace-shell';
import { useWriting } from '../use-writing';
import { writingService } from '../writing.service';
import { WritingSelector } from './writing-selector';

interface WritingClientProps {
  chatId?: string;
  initialTool?: WritingTool;
  initialMessages?: UIMessage[];
  initialMessagesPagination?: {
    hasMore: boolean;
    limit: number;
    nextCursor: string | null;
  };
}

const ChatView = dynamic(() =>
  import('../../_components/chat-view').then((mod) => mod.ChatView)
);

export default function WritingClient({
  chatId,
  initialTool = 'caption',
  initialMessages,
  initialMessagesPagination,
}: WritingClientProps) {
  const t = useTranslations('AIChat');
  const quizAccess = useActiveQuizAttempts();
  const [selectedTool, setSelectedTool] = useState<WritingTool>(initialTool);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const {
    messages,
    hasOlderMessages,
    isLoadingOlderMessages,
    loadOlderMessages,
    maxMessages,
    userMessageCount,
    hasOutput,
    pendingModel,
    isStreaming,
    isLimitReached,
    setPendingModel,
    startChat,
    stop,
  } = useWriting({
    tool: selectedTool,
    chatId,
    initialMessages,
    initialMessagesPagination,
  });

  const notifyLimitReached = () => {
    toast.error(t('limitReachedToast', { count: maxMessages }));
  };

  const handleSubmit = (e?: React.SyntheticEvent, customValue?: string) => {
    e?.preventDefault();
    if (quizAccess.blocked) return;

    const text = customValue || '';
    if (!text.trim()) return;

    if (isLimitReached) {
      notifyLimitReached();
      return;
    }

    startChat(text.trim());
  };

  const viewport = !hasOutput ? (
    <WritingSelector selected={selectedTool} onSelect={setSelectedTool} />
  ) : (
    <ChatView
      messages={messages}
      hasOlderMessages={hasOlderMessages}
      isLoadingOlderMessages={isLoadingOlderMessages}
      isStreaming={isStreaming}
      loadOlderMessages={() => void loadOlderMessages()}
      onSuggestionSelect={(suggestion) =>
        void handleSubmit(undefined, suggestion)
      }
      scrollContainerRef={scrollContainerRef}
      suggestionsDisabled={quizAccess.blocked || isStreaming || isLimitReached}
    />
  );

  const composer = (
    <ChatInput
      quizAccess={quizAccess}
      handleSubmit={handleSubmit}
      isAuthenticated={false}
      isStreaming={isStreaming}
      isUploading={false}
      isChatting={hasOutput}
      isLimitReached={isLimitReached}
      limitCount={maxMessages}
      userMessageCount={userMessageCount}
      onStop={stop}
      selectedModel={pendingModel ?? DEFAULT_CHAT_MODEL}
      onModelChange={setPendingModel}
    />
  );

  return (
    <>
      <ChatWorkspaceShell
        composer={composer}
        scrollContainerRef={scrollContainerRef}
        toolbar={
          chatId && hasOutput ? (
            <ChatShareButton
              chatId={chatId}
              chatType="WRITING_ASSISTANT"
              disabled={isStreaming}
            />
          ) : undefined
        }
        viewport={viewport}
      />
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
