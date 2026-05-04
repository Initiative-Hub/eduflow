'use client';

import type { UIMessage } from 'ai';
import {
  BadgeInfo,
  BookOpen,
  Calculator,
  History,
  Library,
  Palette,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { useChatController } from '../use-chat';

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
}

export type ViewState = 'home' | 'library';

export function AIClient({ userName, chatId, initialMessages }: AIClientProps) {
  const t = useTranslations('AIChat');
  const [view, setView] = useState<ViewState>('home');
  const {
    displayMessages,
    isStreaming,
    isChatting,
    isLimitReached,
    userMessageCount,
    startChat,
    stop,
    maxMessages,
  } = useChatController({ chatId, initialMessages });

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
    <div className="relative flex h-full flex-1 flex-col items-center overflow-x-hidden px-4 py-8 md:px-0">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <div className="h-125 w-125 rounded-full bg-primary/5 blur-[120px]" />
      </div>

      {/* Top Badges - Only show when not chatting */}
      {!isChatting && (
        <div className="absolute top-0 right-10 z-20 hidden flex-col items-end gap-2 md:flex">
          <Badge
            variant="outline"
            className="gap-2 rounded-full border-primary/20 bg-primary/5 px-3 py-1.5 text-primary ring-1 ring-primary/10 backdrop-blur-md"
          >
            <span className="font-bold font-mono text-[10px] opacity-70">
              CC_
            </span>
            <BadgeInfo className="size-3.5" />
            <span className="font-medium text-[11px] tracking-tight">
              {t('criticalThinking')}
            </span>
          </Badge>
          <Badge
            variant="outline"
            className="gap-2 rounded-full border-border/50 bg-slate-100/50 px-3 py-1.5 text-muted-foreground backdrop-blur-md dark:bg-slate-900/50"
          >
            <ShieldCheck className="size-3.5" />
            <span className="font-medium text-[11px] tracking-tight">
              {t('philosophicalLogic')}
            </span>
          </Badge>
        </div>
      )}

      {/* Main Content Area */}
      <div className="relative z-10 flex w-full flex-1 flex-col justify-center overflow-hidden">
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
      </div>

      <ChatInput
        handleSubmit={handleSubmit}
        isStreaming={isStreaming}
        isChatting={isChatting}
        isLimitReached={isLimitReached}
        limitCount={maxMessages}
        userMessageCount={userMessageCount}
        onStop={stop}
      />
    </div>
  );
}
