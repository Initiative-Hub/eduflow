'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  BrainCircuit,
  CheckCircle2,
  ChevronLeft,
  LayoutGrid,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface LandingViewProps {
  userName: string;
  view: 'home' | 'library';
  setView: (view: 'home' | 'library') => void;
  suggestions: any[];
  extendedPrompts: any[];
  onSelectPrompt: (text: string) => void;
}

export function LandingView({
  userName,
  view,
  setView,
  suggestions,
  extendedPrompts,
  onSelectPrompt,
}: LandingViewProps) {
  const t = useTranslations('AIChat');

  return (
    <motion.div
      key="landing"
      exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
      transition={{ duration: 0.4 }}
      className="flex w-full flex-col items-center"
    >
      <AnimatePresence mode="wait">
        {view === 'home' ? (
          <motion.div
            key="home"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="flex w-full flex-col items-center"
          >
            {/* Hero Icon Section */}
            <div className="relative mb-8">
              <div className="flex size-24 items-center justify-center rounded-[2.5rem] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] ring-1 ring-black/5 dark:bg-zinc-950 dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] dark:ring-white/10">
                <BrainCircuit
                  className="size-12 text-primary"
                  strokeWidth={1.5}
                />
              </div>
              <div className="absolute -right-1 -bottom-1 flex size-7 items-center justify-center rounded-full bg-primary text-white shadow-lg ring-4 ring-white dark:ring-zinc-950">
                <CheckCircle2 className="size-4" />
              </div>
            </div>

            {/* Header */}
            <div className="mb-12 max-w-2xl space-y-4 px-4 text-center">
              <h1 className="font-extrabold font-heading text-4xl text-foreground/90 leading-tight tracking-tight md:text-5xl">
                {t('title', { name: userName })}
              </h1>
              <p className="font-medium text-lg text-muted-foreground opacity-80 md:text-xl">
                {t('subtitle')}
              </p>
            </div>

            {/* Suggestions Grid */}
            <div className="flex w-full max-w-5xl flex-col items-center gap-8 px-4">
              <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-3">
                {suggestions.map((item, index) => (
                  <motion.div
                    key={index}
                    whileHover={{
                      y: -5,
                      transition: { duration: 0.2 },
                    }}
                    onClick={() => onSelectPrompt(item.text)}
                  >
                    <Card className="flex h-full cursor-pointer flex-col justify-between border-white/40 bg-white/40 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 hover:border-primary/20 hover:shadow-[0_20px_50px_rgba(139,92,246,0.1)] dark:border-zinc-800/40 dark:bg-zinc-950/40">
                      <div className="space-y-4">
                        <div className="flex size-10 items-center justify-center rounded-xl border border-border/50 bg-white/80 shadow-sm dark:bg-zinc-900/80">
                          {item.icon}
                        </div>
                        <h3 className="font-bold font-heading text-lg leading-snug">
                          {item.text}
                        </h3>
                      </div>
                      <p className="mt-8 font-bold text-[11px] text-muted-foreground/50 uppercase tracking-[0.2em]">
                        {item.category}
                      </p>
                    </Card>
                  </motion.div>
                ))}
              </div>

              <Button
                variant="outline"
                onClick={() => setView('library')}
                className="gap-2 rounded-full border-primary/20 bg-white/40 px-6 py-5 font-medium text-primary shadow-sm transition-all hover:border-primary/50 hover:bg-primary/5 dark:bg-zinc-950/40"
              >
                <LayoutGrid className="size-4" />
                <span>{t('exploreMore')}</span>
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="library"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="flex w-full max-w-5xl flex-col items-center"
          >
            <div className="mb-12 flex w-full items-center justify-between px-4">
              <div className="space-y-1">
                <h2 className="font-bold font-heading text-3xl">
                  {t('promptLibrary.title')}
                </h2>
                <p className="text-muted-foreground">
                  {t('promptLibrary.description')}
                </p>
              </div>
              <Button
                variant="ghost"
                onClick={() => setView('home')}
                className="gap-2 rounded-full text-muted-foreground hover:text-primary"
              >
                <ChevronLeft className="size-4" />
                <span>Back</span>
              </Button>
            </div>

            <div className="mb-16 grid w-full grid-cols-1 gap-4 px-4 md:grid-cols-2">
              {extendedPrompts.map((prompt, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelectPrompt(prompt.title)}
                >
                  <Card className="group h-full cursor-pointer border-border/50 bg-background/50 p-5 backdrop-blur-md transition-colors hover:border-primary/30">
                    <div className="flex gap-4">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-white transition-colors group-hover:bg-primary/5 dark:bg-zinc-900">
                        {prompt.icon}
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold font-heading text-foreground/90 text-sm leading-tight">
                          {prompt.title}
                        </h4>
                        <p className="text-muted-foreground text-xs leading-relaxed">
                          {prompt.description}
                        </p>
                        <div className="pt-2">
                          <span className="font-bold text-[10px] text-primary/60 uppercase tracking-wider">
                            {prompt.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
