'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { AnimatePresence, motion } from 'framer-motion';
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
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
  getUserMessageCount,
  hasReachedUserMessageLimit,
} from '@/utils/chat-limit';
import { ChatInput } from './chat-input';
import { ChatView } from './chat-view';
import { LandingView } from './landing-view';

interface AIClientProps {
  userName?: string;
}

export type ViewState = 'home' | 'library';

const MAX_USER_MESSAGES = 5;

export function AIClient({ userName }: AIClientProps) {
  const t = useTranslations('AIChat');
  const [view, setView] = useState<ViewState>('home');

  const { messages, status, sendMessage, stop } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      // body: {
      //   provider: 'google',
      //   model: 'gemini-2.5-pro',
      // },
    }),
    onError(error) {
      console.error('Chat error:', error);
      toast.error(
        error.message || 'An error occurred while sending the message.'
      );
    },
  });

  const isStreaming = status === 'streaming' || status === 'submitted';
  const isChatting = messages.length > 0;
  const userMessageCount = getUserMessageCount(messages);
  const isLimitReached = hasReachedUserMessageLimit(
    messages,
    MAX_USER_MESSAGES
  );

  const notifyLimitReached = () => {
    toast.error(t('limitReachedToast', { count: MAX_USER_MESSAGES }));
  };

  const handleSubmit = (e?: React.FormEvent, customValue?: string) => {
    e?.preventDefault();

    const text = customValue || '';
    if (!text.trim()) return;

    if (isLimitReached) {
      notifyLimitReached();
      return;
    }

    void sendMessage({ text: text.trim() });
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
      {/* Background Ambient Glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <div className="h-125 w-125 rounded-full bg-primary/5 blur-[120px]" />
      </div>

      {/* Top Badges - Only show when not chatting */}
      <AnimatePresence>
        {!isChatting && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 right-10 z-20 hidden flex-col items-end gap-2 md:flex"
          >
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="relative z-10 flex w-full flex-1 flex-col justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          {!isChatting ? (
            <LandingView
              userName={userName ?? 'User'}
              view={view}
              setView={setView}
              suggestions={suggestions}
              extendedPrompts={extendedPrompts}
              onSelectPrompt={(text) => {
                if (isLimitReached) {
                  notifyLimitReached();
                  return;
                }
                void sendMessage({ text });
              }}
            />
          ) : (
            <ChatView messages={messages} isStreaming={isStreaming} />
          )}
        </AnimatePresence>
      </div>

      <ChatInput
        handleSubmit={handleSubmit}
        isStreaming={isStreaming}
        isChatting={isChatting}
        isLimitReached={isLimitReached}
        limitCount={MAX_USER_MESSAGES}
        userMessageCount={userMessageCount}
        onStop={stop}
      />
    </div>
  );
}
