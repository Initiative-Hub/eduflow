'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, Library, Paperclip, Settings2, Square } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import {
  PromptInput,
  PromptInputButton,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@/components/ai-elements/prompt-input';
import { Button } from '@/components/ui/button';

interface ChatInputProps {
  handleSubmit: (e?: React.FormEvent, customValue?: string) => void;
  isStreaming: boolean;
  isChatting: boolean;
  onStop: () => void;
}

export function ChatInput({
  handleSubmit,
  isStreaming,
  isChatting,
  onStop,
}: ChatInputProps) {
  const t = useTranslations('AIChat');
  const [inputValue, setInputValue] = useState('');

  const onPromptSubmit = (message: PromptInputMessage) => {
    if (isStreaming || !message.text.trim()) return;
    handleSubmit(undefined, message.text);
    setInputValue('');
  };

  return (
    <motion.div
      layout
      className={`relative w-full space-y-4 pt-8 pb-4 ${isChatting ? 'mt-auto' : ''}`}
    >
      <div className="group relative mx-auto max-w-3xl">
        <div className="absolute inset-x-0 -top-px -bottom-px rounded-[2rem] bg-linear-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity duration-500 group-focus-within:opacity-100" />

        <PromptInput
          className="relative *:data-[slot=input-group]:rounded-[2rem] *:data-[slot=input-group]:border-border *:data-[slot=input-group]:bg-white *:data-[slot=input-group]:p-2 *:data-[slot=input-group]:shadow-xl *:data-[slot=input-group]:transition-all *:data-[slot=input-group]:group-focus-within:border-primary/30 *:data-[slot=input-group]:group-focus-within:shadow-2xl dark:*:data-[slot=input-group]:bg-zinc-950"
          onSubmit={onPromptSubmit}
        >
          <PromptInputButton className="ml-1 size-11 rounded-full text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary">
            <Paperclip className="size-5" />
          </PromptInputButton>

          <PromptInputTextarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={t('placeholder')}
            className="h-12 max-h-12 min-h-12 px-1 text-lg leading-normal placeholder:text-muted-foreground/50"
          />

          <PromptInputSubmit
            className="size-11 rounded-full transition-all hover:scale-105"
            disabled={!isStreaming && !inputValue.trim()}
            onStop={onStop}
            status={isStreaming ? 'streaming' : 'ready'}
            variant={isStreaming ? 'destructive' : 'default'}
          >
            {isStreaming ? (
              <Square className="size-4" />
            ) : (
              <ArrowUp className="size-5" />
            )}
          </PromptInputSubmit>
        </PromptInput>
      </div>

      <AnimatePresence>
        {!isChatting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-6 px-4"
          >
            <div className="flex cursor-default items-center gap-1.5 text-muted-foreground/50 transition-colors hover:text-muted-foreground/80">
              <Button
                variant="ghost"
                className="flex h-auto items-center gap-1.5 p-0 hover:bg-transparent"
              >
                <Settings2 className="size-3.5" />
                <span className="font-medium text-[11px]">
                  {t('footer.responseDisclaimer')}
                </span>
              </Button>
            </div>
            <div className="flex cursor-default items-center gap-1.5 text-muted-foreground/50 transition-colors hover:text-muted-foreground/80">
              <Button
                variant="ghost"
                className="flex h-auto items-center gap-1.5 p-0 hover:bg-transparent"
              >
                <Library className="size-3.5" />
                <span className="font-medium text-[11px]">
                  {t('footer.academicDraft')}
                </span>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
