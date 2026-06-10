'use client';

import type { UIMessage } from 'ai';
import { GraduationCap } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import type { StudyMode } from '@/lib/validations/study.schema';
import { type ChatModel, DEFAULT_CHAT_MODEL } from '@/services/ai/chat-models';
import { ChatInput } from '../../_components/chat-input';
import { ChatSidebar } from '../../_components/chat-sidebar';
import { ChatWorkspaceShell } from '../../_components/chat-workspace-shell';
import { studyService } from '../study.service';
import { useStudy } from '../use-study';
import { StudyModeSelector } from './study-mode-selector';

const ChatView = dynamic(() =>
  import('../../_components/chat-view').then((mod) => mod.ChatView)
);

interface StudyClientProps {
  chatId?: string;
  initialMessages?: UIMessage[];
  initialMode?: StudyMode;
  isAuthenticated: boolean;
}

export function StudyClient({
  chatId,
  initialMessages,
  initialMode = 'review',
  isAuthenticated,
}: StudyClientProps) {
  const t = useTranslations('StudyPage');
  const [selectedModel, setSelectedModel] =
    useState<ChatModel>(DEFAULT_CHAT_MODEL);

  const [mode, setMode] = useState<StudyMode>(initialMode);

  const {
    messages,
    isStreaming,
    startChat,
    stop,
    hasOutput,
    isLimitReached,
    maxMessages,
    userMessageCount,
  } = useStudy({
    mode,
    chatId,
    initialMessages,
    selectedModel,
    isAuthenticated,
  });

  const notifyLimitReached = () => {
    toast.error(t('limitReachedToast', { count: maxMessages }));
  };

  const submitText = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (isLimitReached) {
      notifyLimitReached();
      return;
    }

    await startChat(trimmed);
  };

  const handleSubmit = (e?: React.SyntheticEvent, customValue?: string) => {
    e?.preventDefault();
    submitText(customValue || '');
  };

  const viewport = !hasOutput ? (
    <StudyModeSelector mode={mode} onModeChange={setMode} />
  ) : (
    <ChatView
      messages={messages}
      isStreaming={isStreaming}
      onSuggestionSelect={(suggestion) => void submitText(suggestion)}
      suggestionsDisabled={isStreaming || isLimitReached}
    />
  );

  const composer = (
    <ChatInput
      handleSubmit={handleSubmit}
      isAuthenticated={isAuthenticated}
      isStreaming={isStreaming}
      isUploading={false}
      isChatting={hasOutput}
      isLimitReached={isLimitReached}
      limitCount={maxMessages}
      userMessageCount={userMessageCount}
      onStop={stop}
      selectedModel={selectedModel}
      onModelChange={setSelectedModel}
      placeholder={t('input.placeholder')}
    />
  );

  return (
    <>
      <ChatWorkspaceShell composer={composer} viewport={viewport} />
      <ChatSidebar
        currentChatId={chatId}
        emptyIcon={GraduationCap}
        itemIcon={GraduationCap}
        newSessionHref="/study"
        queryKey="study-chat-list"
        sessionHrefPrefix="/study"
        service={{
          listChats: studyService.listChats,
          updateChat: studyService.updateChat,
        }}
        translationNamespace="StudyPage.sidebar"
      />
    </>
  );
}
