'use client';

import type { UIMessage } from 'ai';
import { GraduationCap } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  DEFAULT_STUDY_QUIZ_OPTIONS,
  type StudyMode,
  type StudyQuizOptions,
} from '@/lib/validations/study.schema';
import { DEFAULT_CHAT_MODEL } from '@/services/ai/chat-models';
import type { ChatSubmitAttachments } from '@/types/chat-attachments';
import { ChatInput } from '../../_components/chat-input';
import { ChatLessonReferenceTool } from '../../_components/chat-lesson-reference-tool';
import { ChatSidebar } from '../../_components/chat-sidebar';
import { ChatWorkspaceShell } from '../../_components/chat-workspace-shell';
import { studyService } from '../study.service';
import { useStudy } from '../use-study';
import { LandingRecentStudyChats } from './landing-recent-study-chats';
import { StudyModeSelector } from './study-mode-selector';

const ChatView = dynamic(() =>
  import('../../_components/chat-view').then((mod) => mod.ChatView)
);

interface StudyClientProps {
  chatId?: string;
  initialMessages?: UIMessage[];
  initialMessagesPagination?: {
    hasMore: boolean;
    limit: number;
    nextCursor: string | null;
  };
  initialMode?: StudyMode;
  initialQuizOptions?: StudyQuizOptions;
  isAuthenticated: boolean;
}

export function StudyClient({
  chatId,
  initialMessages,
  initialMessagesPagination,
  initialMode = 'interactiveContent',
  initialQuizOptions,
  isAuthenticated,
}: StudyClientProps) {
  const t = useTranslations('StudyPage');
  const tChat = useTranslations('AIChat');

  const [mode, setMode] = useState<StudyMode>(initialMode);
  const [quizOptions, setQuizOptions] = useState<StudyQuizOptions>(
    initialQuizOptions ?? DEFAULT_STUDY_QUIZ_OPTIONS
  );
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
    isStreaming,
    isLimitReached,
    setPendingModel,
    startChat,
    stop,
  } = useStudy({
    mode,
    quizOptions,
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

  const handleSubmit = async (
    e?: React.SyntheticEvent,
    customValue?: string,
    attachments: ChatSubmitAttachments = { files: [], referencedFiles: [] }
  ) => {
    e?.preventDefault();

    const text = customValue?.trim() || '';
    const finalAttachments = {
      files: attachments.files,
      referencedFiles: attachments.referencedFiles,
      referencedLessons: attachments.referencedLessons ?? [],
    };
    const attachmentCount =
      finalAttachments.files.length +
      finalAttachments.referencedFiles.length +
      finalAttachments.referencedLessons.length;
    if (!text && attachmentCount === 0) return;

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
      setIsUploadingAttachments(finalAttachments.files.length > 0);
      const messageText =
        text ||
        tChat('attachments.defaultMessage', {
          count: attachmentCount,
        });

      await startChat(messageText, finalAttachments);
    } catch (error) {
      toast.error(getErrorMessage(error));
      throw error;
    } finally {
      setIsUploadingAttachments(false);
    }
  };

  const viewport = !hasOutput ? (
    <div className="flex flex-col items-center justify-center">
      <div className="mb-2 w-full max-w-4xl space-y-2">
        <StudyModeSelector
          mode={mode}
          quizOptions={quizOptions}
          onModeChange={setMode}
          onQuizOptionsChange={setQuizOptions}
        />
        <LandingRecentStudyChats />
      </div>
    </div>
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
      tools={
        isAuthenticated
          ? (toolContext) => (
              <ChatLessonReferenceTool
                disabled={toolContext.disabled}
                disabledLessonIds={toolContext.disabledLessonIds}
                maxSelectable={toolContext.maxSelectable}
                onAttach={toolContext.onAttachLessonReferences}
              />
            )
          : undefined
      }
    />
  );

  return (
    <>
      <ChatWorkspaceShell
        composer={composer}
        scrollContainerRef={scrollContainerRef}
        viewport={viewport}
      />
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
