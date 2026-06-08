'use client';

import {
  Atom,
  FlaskConical,
  type LucideIcon,
  Scale,
  TrendingUp,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import {
  SOCRATIC_DISCIPLINES,
  type SocraticDiscipline,
} from '@/lib/validations/socratic.schema';
import { LandingRecentSocraticChats } from './landing-recent-socratic-chats';

interface SocraticDisciplineSelectorProps {
  onSelectPrompt: (prompt: string) => void;
}

const disciplineIcons: Record<SocraticDiscipline, LucideIcon> = {
  quantumPhysics: Atom,
  philosophicalEthics: Scale,
  biochemistry: FlaskConical,
  macroeconomics: TrendingUp,
};

export function SocraticDisciplineSelector({
  onSelectPrompt,
}: SocraticDisciplineSelectorProps) {
  const t = useTranslations('SocraticPage');

  const getDisciplinePrompt = (discipline: SocraticDiscipline) => {
    const title = t(`disciplines.${discipline}.title`);
    const description = t(`disciplines.${discipline}.description`);
    return `${title}\n\n${description}`;
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="mb-2 max-w-4xl space-y-2">
        <div className="space-y-8 px-4 pt-10">
          <div className="relative flex flex-col items-center text-center">
            <h1 className="mt-5 font-black font-heading text-3xl text-foreground leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              {t.rich('title', {
                accent: (chunks) => (
                  <span className="text-primary italic">{chunks}</span>
                ),
              })}
            </h1>
            <p className="mt-4 max-w-3xl text-balance text-base text-muted-foreground leading-7 sm:text-lg">
              {t.rich('subtitle', {
                mark: (chunks) => (
                  <span className="font-bold text-primary">{chunks}</span>
                ),
              })}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {SOCRATIC_DISCIPLINES.map((discipline) => {
              const Icon = disciplineIcons[discipline];

              return (
                <Card
                  aria-label={t(`disciplines.${discipline}.title`)}
                  className="group min-h-60 cursor-pointer overflow-hidden rounded-[1.6rem] border border-border/60 bg-card/95 p-5 text-left shadow-lg shadow-primary/5 transition-all duration-200 hover:-translate-y-1 hover:border-primary/25 hover:shadow-primary/10 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  key={discipline}
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    onSelectPrompt(getDisciplinePrompt(discipline))
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelectPrompt(getDisciplinePrompt(discipline));
                    }
                  }}
                >
                  <div className="flex h-full flex-col gap-4">
                    <div className="flex size-12 items-center justify-center rounded-2xl border border-primary/10 bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="font-bold text-foreground text-lg leading-tight tracking-tight">
                        {t(`disciplines.${discipline}.title`)}
                      </h2>
                      <p className="text-muted-foreground text-sm leading-6">
                        {t(`disciplines.${discipline}.description`)}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
        <LandingRecentSocraticChats />
      </div>
    </div>
  );
}
