'use client';

import { GraduationCap, LockKeyhole } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import type React from 'react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DEFAULT_SOCRATIC_GUIDANCE_DEPTH } from '@/lib/validations/socratic.schema';
import { DEFAULT_CHAT_MODEL } from '@/services/ai/chat-provider.constants';
import type { ChatSubmitAttachments } from '@/types/chat-attachments';
import type { SocraticUIMessage } from '@/types/socratic-ui-message';
import { ChatInput } from '../../_components/chat-input';
import { ChatShareButton } from '../../_components/chat-share-button';
import { ChatSidebar } from '../../_components/chat-sidebar';
import { ChatWorkspaceShell } from '../../_components/chat-workspace-shell';
import { socraticService } from '../socratic.service';
import { useSocratic } from '../use-socratic';
import { SocraticDisciplineSelector } from './socratic-discipline-selector';
import { SocraticGuidanceDepthControl } from './socratic-guidance-depth-control';

interface SocraticClientProps {
  chatId?: string;
  initialMessages?: SocraticUIMessage[];
  initialMessagesPagination?: {
    hasMore: boolean;
    limit: number;
    nextCursor: string | null;
  };
  isAuthenticated: boolean;
}

const ChatView = dynamic(() =>
  import('../../_components/chat-view').then((mod) => mod.ChatView)
);

export function SocraticClient({
  chatId,
  initialMessages,
  initialMessagesPagination,
  isAuthenticated,
}: SocraticClientProps) {
  const t = useTranslations('SocraticPage');
  const tChat = useTranslations('AIChat');

  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
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
    pendingSocraticGuidanceDepth,
    isStreaming,
    isLimitReached,
    setPendingModel,
    setPendingSocraticGuidanceDepth,
    startChat,
    stop,
  } = useSocratic({
    chatId,
    initialMessages,
    initialMessagesPagination,
    isAuthenticated,
  });

  const notifyLimitReached = () => {
    toast.error(t('limitReachedToast', { count: maxMessages }));
  };

  const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) return error.message;
    if (
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof error.message === 'string'
    ) {
      return error.message;
    }

    return tChat('attachments.uploadError');
  };

  const submitText = async (
    text: string,
    attachments: ChatSubmitAttachments = { files: [], referencedFiles: [] }
  ) => {
    const trimmed = text.trim();
    const attachmentCount =
      attachments.files.length + attachments.referencedFiles.length;
    if (!trimmed && attachmentCount === 0) return;

    if (isLimitReached) {
      notifyLimitReached();
      return;
    }

    if (attachmentCount > 0 && !isAuthenticated) {
      const error = new Error(tChat('attachments.signInRequired'));
      toast.error(error.message);
      throw error;
    }

    try {
      setIsUploadingAttachments(attachments.files.length > 0);
      const messageText =
        trimmed ||
        tChat('attachments.defaultMessage', {
          count: attachmentCount,
        });

      await startChat(messageText, attachments);
    } catch (error) {
      toast.error(getErrorMessage(error));
      throw error;
    } finally {
      setIsUploadingAttachments(false);
    }
  };

  const handleSubmit = (
    e?: React.SyntheticEvent,
    customValue?: string,
    attachments: ChatSubmitAttachments = { files: [], referencedFiles: [] }
  ) => {
    e?.preventDefault();
    return submitText(customValue || '', attachments);
  };

  const viewport = !hasOutput ? (
    <SocraticDisciplineSelector onSelectPrompt={submitText} />
  ) : (
    <ChatView
      messages={messages}
      hasOlderMessages={hasOlderMessages}
      isLoadingOlderMessages={isLoadingOlderMessages}
      isStreaming={isStreaming}
      loadOlderMessages={() => void loadOlderMessages()}
      onSuggestionSelect={(suggestion) => void submitText(suggestion)}
      scrollContainerRef={scrollContainerRef}
      suggestionsDisabled={isStreaming || isLimitReached}
    />
  );

  const composer = (
    <ChatInput
      handleSubmit={handleSubmit}
      isAuthenticated={isAuthenticated}
      isStreaming={isStreaming}
      isUploading={isUploadingAttachments}
      isChatting={hasOutput}
      isLimitReached={isLimitReached}
      limitCount={maxMessages}
      userMessageCount={userMessageCount}
      onStop={stop}
      selectedModel={pendingModel ?? DEFAULT_CHAT_MODEL}
      onModelChange={setPendingModel}
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
          guidanceDepth={
            pendingSocraticGuidanceDepth ?? DEFAULT_SOCRATIC_GUIDANCE_DEPTH
          }
          onGuidanceDepthChange={setPendingSocraticGuidanceDepth}
        />
      }
    />
  );

  return (
    <>
      <ChatWorkspaceShell
        composer={composer}
        scrollContainerRef={scrollContainerRef}
        toolbar={
          chatId && isAuthenticated && hasOutput ? (
            <ChatShareButton
              chatId={chatId}
              chatType="SOCRATIC_TUTOR"
              disabled={isStreaming}
            />
          ) : undefined
        }
        viewport={viewport}
      />
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
