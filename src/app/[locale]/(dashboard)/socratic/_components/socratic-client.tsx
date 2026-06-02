'use client';

import { GraduationCap, LockKeyhole } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import type React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { SocraticUIMessage } from '@/app/api/v1/ai/socratic/[chatId]/socratic.constants';
import { Button } from '@/components/ui/button';
import {
  DEFAULT_SOCRATIC_DISCIPLINE,
  type SocraticDiscipline,
} from '@/lib/validations/socratic.schema';
import { type ChatModel, DEFAULT_CHAT_MODEL } from '@/services/ai/chat-models';
import { ChatInput } from '../../_components/chat-input';
import { ChatSidebar } from '../../_components/chat-sidebar';
import { ChatWorkspaceShell } from '../../_components/chat-workspace-shell';
import { socraticService } from '../socratic.service';
import { useSocratic } from '../use-socratic';
import { SocraticDisciplineSelector } from './socratic-discipline-selector';

interface SocraticClientProps {
  chatId?: string;
  initialDiscipline?: SocraticDiscipline;
  initialMessages?: SocraticUIMessage[];
  isAuthenticated: boolean;
}

const ChatView = dynamic(() =>
  import('../../_components/chat-view').then((mod) => mod.ChatView)
);

export function SocraticClient({
  chatId,
  initialDiscipline = DEFAULT_SOCRATIC_DISCIPLINE,
  initialMessages,
  isAuthenticated,
}: SocraticClientProps) {
  const [selectedDiscipline, setSelectedDiscipline] =
    useState<SocraticDiscipline>(initialDiscipline);
  const [selectedModel, setSelectedModel] =
    useState<ChatModel>(DEFAULT_CHAT_MODEL);
  const t = useTranslations('SocraticPage');

  const {
    messages,
    isStreaming,
    startChat,
    stop,
    hasOutput,
    isLimitReached,
    maxMessages,
    userMessageCount,
  } = useSocratic({
    discipline: selectedDiscipline,
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
    void submitText(customValue || '');
  };

  const viewport = !hasOutput ? (
    <SocraticDisciplineSelector
      selected={selectedDiscipline}
      onSelect={setSelectedDiscipline}
    />
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
      footer={
        <div className="flex items-center justify-center px-4">
          <Button
            className="flex h-auto items-center gap-1.5 p-0 text-muted-foreground/60 hover:bg-transparent hover:text-muted-foreground"
            variant="ghost"
          >
            <LockKeyhole className="size-3.5" />
            <span className="font-medium text-[11px]">{t('input.footer')}</span>
          </Button>
        </div>
      }
    />
  );

  return (
    <>
      <ChatWorkspaceShell composer={composer} viewport={viewport} />
      <ChatSidebar
        currentChatId={chatId}
        emptyIcon={GraduationCap}
        itemIcon={GraduationCap}
        newSessionHref="/socratic"
        queryKey="socratic-chat-list"
        sessionHrefPrefix="/socratic"
        service={{
          listChats: socraticService.listChats,
          updateChat: socraticService.updateChat,
        }}
        translationNamespace="SocraticPage.sidebar"
      />
    </>
  );
}
