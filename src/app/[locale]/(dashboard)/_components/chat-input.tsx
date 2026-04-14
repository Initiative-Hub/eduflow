'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, Library, Paperclip, Settings2, Square } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isStreaming) return;
    handleSubmit(e, inputValue);
    setInputValue('');
  };

  return (
    <motion.div
      layout
      className={`relative w-full space-y-4 pt-8 pb-4 ${isChatting ? 'mt-auto' : ''}`}
    >
      <form onSubmit={onFormSubmit} className="group relative">
        <div className="absolute inset-x-0 -top-px -bottom-px rounded-[2rem] bg-linear-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity duration-500 group-focus-within:opacity-100" />
        <div className="relative flex items-center rounded-[2rem] border border-border bg-white p-2 shadow-xl transition-all group-focus-within:border-primary/30 group-focus-within:shadow-2xl dark:bg-zinc-950">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="ml-1 size-11 rounded-full text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary"
          >
            <Paperclip className="size-5" />
          </Button>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={t('placeholder')}
            className="h-12 border-0 bg-transparent text-lg placeholder:text-muted-foreground/50 focus-visible:ring-0"
          />
          {isStreaming ? (
            <Button
              type="button"
              onClick={onStop}
              className="size-11 rounded-full bg-destructive shadow-destructive/20 shadow-lg transition-all hover:scale-105 hover:bg-destructive/90"
              size="icon"
            >
              <Square className="size-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              className="size-11 rounded-full shadow-lg shadow-primary/20 transition-all hover:scale-105"
              size="icon"
              disabled={!inputValue.trim()}
            >
              <ArrowUp className="size-5" />
            </Button>
          )}
        </div>
      </form>

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
