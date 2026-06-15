'use client';

import type { UIMessage } from 'ai';
import {
  BookOpen,
  Calculator,
  History,
  Library,
  Palette,
  Sparkles,
  Zap,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { DEFAULT_CHAT_MODEL } from '@/services/ai/chat-models';
import type { ChatSubmitAttachments } from '@/types/chat-attachments';
import { ChatSidebar } from '../../_components/chat-sidebar';
import { ChatWorkspaceShell } from '../../_components/chat-workspace-shell';
import { useChatController } from '../use-chat';

const LandingView = dynamic(() =>
  import('./landing-view').then((mod) => mod.LandingView)
);

const ChatView = dynamic(() =>
  import('../../_components/chat-view').then((mod) => mod.ChatView)
);

const ChatInput = dynamic(() =>
  import('../../_components/chat-input').then((mod) => mod.ChatInput)
);
interface AIClientProps {
  userName?: string;
  chatId?: string;
  initialMessages?: UIMessage[];
  isAuthenticated: boolean;
}

export type ViewState = 'home' | 'library';

export function AIClient({
  userName,
  chatId,
  initialMessages,
  isAuthenticated,
}: AIClientProps) {
  const t = useTranslations('AIChat');

  const [view, setView] = useState<ViewState>('home');
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);

  const {
    messages,
    maxMessages,
    userMessageCount,
    hasOutput,
    pendingModel,
    isStreaming,
    isLimitReached,
    setPendingModel,
    startChat,
    stop,
  } = useChatController({
    chatId,
    initialMessages,
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

    return t('attachments.uploadError');
  };

  const handleSubmit = async (
    e?: React.FormEvent,
    customValue?: string,
    attachments: ChatSubmitAttachments = { files: [], referencedFiles: [] }
  ) => {
    e?.preventDefault();

    const text = customValue?.trim() || '';
    const attachmentCount =
      attachments.files.length + attachments.referencedFiles.length;
    if (!text && attachmentCount === 0) return;

    if (isLimitReached) {
      notifyLimitReached();
      return;
    }

    if (attachmentCount > 0 && !isAuthenticated) {
      const error = new Error(t('attachments.signInRequired'));
      toast.error(error.message);
      throw error;
    }

    try {
      setIsUploadingAttachments(attachments.files.length > 0);
      const messageText =
        text || t('attachments.defaultMessage', { count: attachmentCount });

      await startChat(messageText, attachments);
    } catch (error) {
      toast.error(getErrorMessage(error));
      throw error;
    } finally {
      setIsUploadingAttachments(false);
    }
  };

  const suggestions = [
    {
      icon: <Library className="size-5 text-indigo-500" />,
      text: t('suggestions.socratic'),
      category: t('categories.methodology'),
    },
    {
      icon: <Palette className="size-5 text-purple-500" />,
      text: t('suggestions.brainstorm'),
      category: t('categories.artHistory'),
    },
    {
      icon: <Zap className="size-5 text-amber-500" />,
      text: t('suggestions.trends'),
      category: t('categories.science'),
    },
  ];

  const extendedPrompts = [
    {
      icon: <Calculator className="size-5 text-blue-500" />,
      title: t('promptLibrary.math.title'),
      description: t('promptLibrary.math.description'),
      category: t('categories.mathematics'),
    },
    {
      icon: <BookOpen className="size-5 text-emerald-500" />,
      title: t('promptLibrary.lit.title'),
      description: t('promptLibrary.lit.description'),
      category: t('categories.literature'),
    },
    {
      icon: <Sparkles className="size-5 text-purple-500" />,
      title: t('promptLibrary.phil.title'),
      description: t('promptLibrary.phil.description'),
      category: t('categories.philosophy'),
    },
    {
      icon: <History className="size-5 text-orange-500" />,
      title: t('promptLibrary.hist.title'),
      description: t('promptLibrary.hist.description'),
      category: t('categories.history'),
    },
  ];

  const viewport = !hasOutput ? (
    <LandingView
      userName={userName ?? 'Guest'}
      view={view}
      setView={setView}
      suggestions={suggestions}
      extendedPrompts={extendedPrompts}
      onSelectPrompt={(text) => {
        if (isLimitReached) {
          notifyLimitReached();
          return;
        }
        startChat(text);
      }}
    />
  ) : (
    <ChatView
      messages={messages}
      isStreaming={isStreaming}
      onSuggestionSelect={(suggestion) =>
        void handleSubmit(undefined, suggestion)
      }
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
    />
  );

  return (
    <>
      <ChatWorkspaceShell composer={composer} viewport={viewport} />
      <ChatSidebar currentChatId={chatId} />
    </>
  );
}
