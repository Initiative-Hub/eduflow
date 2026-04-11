'use client';

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
import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ChatInput } from './chat-input';
import { ChatView } from './chat-view';
import { LandingView } from './landing-view';

interface AIClientProps {
  userName: string;
}

export type ViewState = 'home' | 'library';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function AIClient({ userName }: AIClientProps) {
  const t = useTranslations('AIChat');
  const [inputValue, setInputValue] = useState('');
  const [view, setView] = useState<ViewState>('home');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isChatting = messages.length > 0;

  // biome-ignore lint/correctness/useExhaustiveDependencies: We use these as triggers to scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, isTyping]);

  const handleSubmit = (e?: React.FormEvent, customValue?: string) => {
    e?.preventDefault();
    const finalValue = customValue || inputValue;
    if (!finalValue.trim()) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: finalValue.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Mock AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `I am currently in development mode. You asked: "${userMessage.content}". How can I assist you further with your scholarly inquiry?`,
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
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
        <div className="h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px]" />
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
      <div className="relative z-10 flex w-full max-w-5xl flex-1 flex-col justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          {!isChatting ? (
            <LandingView
              userName={userName}
              view={view}
              setView={setView}
              suggestions={suggestions}
              extendedPrompts={extendedPrompts}
              onSelectPrompt={(text) => {
                setInputValue(text);
                handleSubmit(undefined, text);
              }}
            />
          ) : (
            <ChatView
              messages={messages}
              isTyping={isTyping}
              scrollRef={scrollRef}
            />
          )}
        </AnimatePresence>
      </div>

      <ChatInput
        inputValue={inputValue}
        setInputValue={setInputValue}
        handleSubmit={handleSubmit}
        isTyping={isTyping}
        isChatting={isChatting}
      />
    </div>
  );
}
