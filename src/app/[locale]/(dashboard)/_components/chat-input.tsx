'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, Library, Loader2, Paperclip, Settings2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ChatInputProps {
  inputValue: string;
  setInputValue: (value: string) => void;
  handleSubmit: (e?: React.FormEvent) => void;
  isTyping: boolean;
  isChatting: boolean;
}

export function ChatInput({
  inputValue,
  setInputValue,
  handleSubmit,
  isTyping,
  isChatting,
}: ChatInputProps) {
  const t = useTranslations('AIChat');

  return (
    <motion.div
      layout
      className={`relative z-20 w-full max-w-3xl space-y-4 pt-8 pb-4 ${isChatting ? 'mt-auto' : ''}`}
    >
      <form onSubmit={handleSubmit} className="group relative">
        <div className="absolute inset-x-0 -top-px -bottom-px rounded-[2rem] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity duration-500 group-focus-within:opacity-100" />
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
          <Button
            type="submit"
            className="size-11 rounded-full shadow-lg shadow-primary/20 transition-all hover:scale-105"
            size="icon"
            disabled={!inputValue.trim() || isTyping}
          >
            {isTyping ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <ArrowUp className="size-5" />
            )}
          </Button>
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
