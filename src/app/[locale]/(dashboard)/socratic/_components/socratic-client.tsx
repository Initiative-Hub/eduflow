'use client';

import { GraduationCap, LockKeyhole } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import type React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DEFAULT_SOCRATIC_GUIDANCE_DEPTH,
  type SocraticGuidanceDepth,
} from '@/lib/validations/socratic.schema';
import { type ChatModel, DEFAULT_CHAT_MODEL } from '@/services/ai/chat-models';
import type { SocraticUIMessage } from '@/types/socratic-ui-message';
import { ChatInput } from '../../_components/chat-input';
import { ChatSidebar } from '../../_components/chat-sidebar';
import { ChatWorkspaceShell } from '../../_components/chat-workspace-shell';
import { socraticService } from '../socratic.service';
import { useSocratic } from '../use-socratic';
import { SocraticDisciplineSelector } from './socratic-discipline-selector';
import { SocraticGuidanceDepthControl } from './socratic-guidance-depth-control';

interface SocraticClientProps {
  chatId?: string;
  initialMessages?: SocraticUIMessage[];
  isAuthenticated: boolean;
}

const ChatView = dynamic(() =>
  import('../../_components/chat-view').then((mod) => mod.ChatView)
);

export function SocraticClient({
  chatId,
  initialMessages,
  isAuthenticated,
}: SocraticClientProps) {
  const t = useTranslations('SocraticPage');
  const [selectedModel, setSelectedModel] =
    useState<ChatModel>(DEFAULT_CHAT_MODEL);
  const [guidanceDepth, setGuidanceDepth] = useState<SocraticGuidanceDepth>(
    DEFAULT_SOCRATIC_GUIDANCE_DEPTH
  );

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
    chatId,
    initialMessages,
    selectedModel,
    guidanceDepth,
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
    <SocraticDisciplineSelector onSelectPrompt={submitText} />
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
      tools={
        <SocraticGuidanceDepthControl
          guidanceDepth={guidanceDepth}
          onGuidanceDepthChange={setGuidanceDepth}
        />
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
