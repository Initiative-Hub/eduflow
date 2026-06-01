'use client';

import {
  Atom,
  BookOpen,
  Calculator,
  FlaskConical,
  Globe2,
  Landmark,
  Languages,
  Leaf,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ComponentType } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { SocraticSubject } from '@/lib/validations/socratic.schema';
import { SOCRATIC_SUBJECTS } from '@/lib/validations/socratic.schema';

interface SocraticSubjectSelectorProps {
  selected: SocraticSubject;
  onSelect: (subject: SocraticSubject) => void;
}

const subjectIcons: Record<SocraticSubject, ComponentType> = {
  math: Calculator,
  physics: Atom,
  chemistry: FlaskConical,
  biology: Leaf,
  history: Landmark,
  geography: Globe2,
  english: Languages,
  other: BookOpen,
};

export function SocraticSubjectSelector({
  selected,
  onSelect,
}: SocraticSubjectSelectorProps) {
  const t = useTranslations('SocraticPage');

  return (
    <div className="flex h-full flex-col items-center">
      <div className="mt-12 mb-6 flex max-w-2xl flex-col gap-2 px-4 text-center">
        <h1 className="font-extrabold font-heading text-3xl text-foreground tracking-tight sm:text-4xl">
          {t('title')}
        </h1>
        <p className="text-base text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="grid w-full max-w-6xl grid-cols-1 gap-4 px-4 sm:grid-cols-2 xl:grid-cols-4">
        {SOCRATIC_SUBJECTS.map((subject) => {
          const Icon = subjectIcons[subject];

          return (
            <Card
              className={cn(
                'min-h-32 cursor-pointer text-left transition-all hover:-translate-y-0.5 hover:shadow-md',
                selected === subject
                  ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                  : 'border-border/70 bg-card hover:border-primary/40'
              )}
              key={subject}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(subject)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(subject);
                }
              }}
            >
              <CardHeader className="pb-1">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon />
                  </div>
                  <CardTitle className="text-lg">
                    {t(`subjects.${subject}.title`)}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="leading-relaxed">
                  {t(`subjects.${subject}.description`)}
                </CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
