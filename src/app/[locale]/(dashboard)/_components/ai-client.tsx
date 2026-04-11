'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUp,
  BadgeInfo,
  BookOpen,
  BrainCircuit,
  Calculator,
  CheckCircle2,
  ChevronLeft,
  History,
  LayoutGrid,
  Library,
  Palette,
  Paperclip,
  Settings2,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface AIClientProps {
  userName: string;
}

type ViewState = 'home' | 'library';

export function AIClient({ userName }: AIClientProps) {
  const t = useTranslations('AIChat');
  const [inputValue, setInputValue] = useState('');
  const [view, setView] = useState<ViewState>('home');

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
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-x-hidden px-4 py-12 md:px-0">
      {/* Background Ambient Glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <div className="h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      {/* Top Badges */}
      <div className="absolute top-0 right-10 hidden flex-col items-end gap-2 md:flex">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
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
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
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
      </div>

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
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                    onClick={() => setInputValue(item.text)}
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
                  onClick={() => {
                    setInputValue(prompt.title);
                    setView('home');
                  }}
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

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="w-full max-w-3xl space-y-4 py-8"
      >
        <div className="group relative">
          <div className="absolute inset-x-0 -top-px -bottom-px rounded-[2rem] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity duration-500 group-focus-within:opacity-100" />
          <div className="relative flex items-center rounded-[2rem] border border-border bg-white p-2 shadow-lg transition-all group-focus-within:border-primary/30 group-focus-within:shadow-2xl dark:bg-zinc-950">
            <Button
              variant="ghost"
              size="icon"
              className="ml-1 size-11 rounded-full text-muted-foreground hover:bg-primary/5 hover:text-primary"
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
              className="size-11 rounded-full shadow-lg shadow-primary/20"
              size="icon"
              disabled={!inputValue.trim()}
            >
              <ArrowUp className="size-5" />
            </Button>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-center gap-6 px-4">
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
        </div>
      </motion.div>
    </div>
  );
}
