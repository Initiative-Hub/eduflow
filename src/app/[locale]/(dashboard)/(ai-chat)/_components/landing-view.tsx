'use client';

import { ChevronLeft, LayoutGrid } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LandingRecentChats } from './landing-recent-chats';

interface LandingSuggestionItem {
  text: string;
  category: string;
  icon: React.ReactNode;
}
interface LandingExtendedPromptItem {
  title: string;
  category: string;
  description: string;
  icon: React.ReactNode;
}

interface LandingViewProps {
  userName: string;
  view: 'home' | 'library';
  setView: (view: 'home' | 'library') => void;
  suggestions: LandingSuggestionItem[];
  extendedPrompts: LandingExtendedPromptItem[];
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
    <div className="flex flex-col items-center justify-center">
      {view === 'home' ? (
        <div className="mb-2 max-w-4xl space-y-2">
          <div className="flex flex-col items-center">
            {/* Header */}
            <div className="mt-12 mb-6 max-w-2xl space-y-2 px-4 text-center">
              <h1 className="font-extrabold font-heading text-3xl text-foreground/90 leading-tight tracking-tight md:text-4xl">
                {t('title', { name: userName })}
              </h1>
              <p className="font-medium text-base text-muted-foreground opacity-80 md:text-lg">
                {t('subtitle')}
              </p>
            </div>

            <div className="flex flex-col items-center gap-4 px-4">
              <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
                {suggestions.map((item, index) => (
                  <div
                    className="transition-transform duration-200 hover:-translate-y-1"
                    key={index}
                    onClick={() => onSelectPrompt(item.text)}
                  >
                    <Card className="flex h-full cursor-pointer flex-col justify-between border-white/40 bg-white/40 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 hover:border-primary/20 hover:shadow-[0_20px_50px_rgba(139,92,246,0.1)] dark:border-zinc-800/40 dark:bg-zinc-950/40">
                      <div className="space-y-2">
                        <div className="flex size-10 items-center justify-center rounded-xl border border-border/50 bg-white/80 shadow-sm dark:bg-zinc-900/80">
                          {item.icon}
                        </div>
                        <h3 className="font-bold font-heading text-base leading-snug">
                          {item.text}
                        </h3>
                      </div>
                      <p className="mt-4 font-bold text-[11px] text-muted-foreground/50 uppercase tracking-[0.2em]">
                        {item.category}
                      </p>
                    </Card>
                  </div>
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
          </div>
          <LandingRecentChats />
        </div>
      ) : (
        <div className="flex max-w-4xl flex-col items-center">
          <div className="mt-12 mb-6 flex w-full items-center justify-between px-4">
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

          <div className="mb-8 grid w-full grid-cols-1 gap-4 px-4 md:grid-cols-2">
            {extendedPrompts.map((prompt, index) => (
              <div
                className="transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
                key={index}
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
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
