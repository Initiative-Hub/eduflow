'use client';

import type { UIMessage } from 'ai';
import { BookMarked, ClipboardList, GraduationCap, Tag } from 'lucide-react';
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
    maxMessage,
    userMessageCount,
  } = useStudy({
    mode,
    chatId,
    initialMessages,
    selectedModel,
    isAuthenticated,
  });

  const notifyLimitReached = () => {
    toast.error(t('limitReachedToast', { count: maxMessage }));
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

  //TODO: should i extract this constant to new component
  const FEATURE_CARDS = [
    {
      key: 'review' as StudyMode,
      icon: BookMarked,
      label: t('modes.review'),
      accent:
        'bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900/40',
      activeAccent: 'ring-2 ring-violet-400 bg-violet-50 dark:bg-violet-950/30',
    },
    {
      key: 'practiceTest' as StudyMode,
      icon: ClipboardList,
      label: t('modes.practiceTest'),
      accent:
        'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/40',
      activeAccent: 'ring-2 ring-indigo-400 bg-indigo-50 dark:bg-indigo-950/30',
    },
    {
      key: 'keywords' as StudyMode,
      icon: Tag,
      label: t('modes.keywords'),
      accent:
        'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40',
      activeAccent: 'ring-2 ring-amber-400 bg-amber-50 dark:bg-amber-950/30',
    },
  ];

  const viewport = !hasOutput ? (
    <>LANDING PAGE</>
  ) : (
    <ChatView
      messages={messages}
      isStreaming
      onSuggestionSelect={(suggestion) => void submitText(suggestion)}
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
      limitCount={maxMessage}
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
