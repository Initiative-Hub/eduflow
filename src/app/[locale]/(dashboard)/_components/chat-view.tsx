'use client';

import { motion } from 'framer-motion';
import { Bot, Loader2, User } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatViewProps {
  messages: Message[];
  isTyping: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

export function ChatView({ messages, isTyping, scrollRef }: ChatViewProps) {
  const t = useTranslations('AIChat');

  return (
    <motion.div
      key="chat"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex h-[calc(100vh-280px)] w-full flex-col"
    >
      <div
        ref={scrollRef}
        className="custom-scrollbar flex-1 space-y-6 overflow-y-auto scroll-smooth py-4 pr-4"
      >
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-start gap-4 ${message.role === 'assistant' ? '' : 'flex-row-reverse'}`}
          >
            <div
              className={`flex size-10 shrink-0 items-center justify-center rounded-xl border ${message.role === 'assistant' ? 'border-primary/20 bg-primary/10 text-primary' : 'border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'}`}
            >
              {message.role === 'assistant' ? (
                <Bot className="size-5" />
              ) : (
                <User className="size-5" />
              )}
            </div>
            <div
              className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-sm ${message.role === 'assistant' ? 'border border-border bg-white dark:bg-zinc-900' : 'bg-primary text-primary-foreground'}`}
            >
              <p className="text-[15px] leading-relaxed">{message.content}</p>
            </div>
          </motion.div>
        ))}

        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-4"
          >
            <div className="flex size-10 shrink-0 animate-pulse items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <Bot className="size-5" />
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-white px-5 py-3 shadow-sm dark:bg-zinc-900">
              <Loader2 className="size-4 animate-spin text-primary" />
              <span className="font-medium text-muted-foreground text-sm">
                Scholar AI is reflecting...
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
