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
import { type ChatModel, DEFAULT_CHAT_MODEL } from '@/services/ai/chat-models';
import { useChatController } from '../use-chat';
import { ChatSidebar } from './chat-sidebar';

const LandingView = dynamic(() =>
  import('./landing-view').then((mod) => mod.LandingView)
);

const ChatView = dynamic(() =>
  import('./chat-view').then((mod) => mod.ChatView)
);

const ChatInput = dynamic(() =>
  import('./chat-input').then((mod) => mod.ChatInput)
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
  const [selectedModel, setSelectedModel] =
    useState<ChatModel>(DEFAULT_CHAT_MODEL);
  const {
    displayMessages,
    isStreaming,
    isChatting,
    isLimitReached,
    userMessageCount,
    startChat,
    stop,
    maxMessages,
  } = useChatController({
    chatId,
    initialMessages,
    isAuthenticated,
    selectedModel,
  });

  const notifyLimitReached = () => {
    toast.error(t('limitReachedToast', { count: maxMessages }));
  };

  const handleSubmit = (e?: React.FormEvent, customValue?: string) => {
    e?.preventDefault();

    const text = customValue || '';
    if (!text.trim()) return;

    if (isLimitReached) {
      notifyLimitReached();
      return;
    }

    void startChat(text.trim());
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

  return (
    <>
      <div className="relative flex flex-col items-center gap-8 px-8">
        {/* Main Content Area */}
        {!isChatting ? (
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
              void startChat(text);
            }}
          />
        ) : (
          <ChatView messages={displayMessages} isStreaming={isStreaming} />
        )}

        <ChatInput
          handleSubmit={handleSubmit}
          isStreaming={isStreaming}
          isChatting={isChatting}
          isLimitReached={isLimitReached}
          limitCount={maxMessages}
          userMessageCount={userMessageCount}
          onStop={stop}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
        />
      </div>
      <ChatSidebar currentChatId={chatId} />
    </>
  );
}
