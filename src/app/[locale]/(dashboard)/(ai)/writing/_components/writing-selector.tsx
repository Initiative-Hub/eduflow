'use client';

import { List, Megaphone, SpellCheck, Type, Wand2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { WritingTool } from '@/lib/validations/writing.schema';
import { LandingRecentWritingChats } from './landing-recent-writing-chats';

interface WritingSelectorProps {
  selected: WritingTool;
  onSelect: (tool: WritingTool) => void;
}

const toolIcons: Record<WritingTool, ReactNode> = {
  caption: <Megaphone className="size-5 text-primary" />,
  paraphrase: <Type className="size-5 text-primary" />,
  email: <span className="font-bold text-lg text-primary">@</span>,
  outline: <List className="size-5 text-primary" />,
  grammar: <SpellCheck className="size-5 text-primary" />,
  rewrite: <Wand2 className="size-5 text-primary" />,
};

const toolIds: WritingTool[] = [
  'caption',
  'paraphrase',
  'email',
  'outline',
  'grammar',
  'rewrite',
];

export function WritingSelector({ selected, onSelect }: WritingSelectorProps) {
  const t = useTranslations('WritingPage');

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="mb-2 max-w-4xl space-y-2">
        <div className="flex flex-col items-center">
          <div className="mt-12 mb-6 space-y-2 text-center">
            <h1 className="font-extrabold text-3xl text-foreground tracking-tight sm:text-4xl">
              {t.rich('title', {
                italic: (chunks) => (
                  <span className="text-primary italic">{chunks}</span>
                ),
              })}
            </h1>
            <p className="text-base text-muted-foreground">{t('subtitle')}</p>
          </div>

          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {toolIds.map((id) => (
              <Card
                key={id}
                onClick={() => onSelect(id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(id);
                  }
                }}
                className={cn(
                  'flex cursor-pointer flex-col items-start text-left transition-all hover:shadow-md',
                  selected === id
                    ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                    : 'border-border/50 bg-card hover:border-primary/50'
                )}
              >
                <CardHeader className="w-full pb-2">
                  <div
                    className={cn(
                      'mb-2 flex size-12 items-center justify-center rounded-2xl bg-primary/10'
                    )}
                  >
                    {toolIcons[id]}
                  </div>
                  <CardTitle className="font-bold text-lg">
                    {t(`tools.${id}.title`)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {t(`tools.${id}.description`)}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        <LandingRecentWritingChats />
      </div>
    </div>
  );
}
