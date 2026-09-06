'use client';

import {
  ArrowRight,
  Library,
  ListPlus,
  type LucideIcon,
  Sparkles,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

export type QuizCreationMethod = 'ai' | 'manual' | 'question-bank';

interface QuizCreationMethodsProps {
  onSelect: (method: QuizCreationMethod) => void;
}

const METHODS: Array<{
  id: QuizCreationMethod;
  icon: LucideIcon;
}> = [
  { id: 'ai', icon: Sparkles },
  { id: 'manual', icon: ListPlus },
  { id: 'question-bank', icon: Library },
];

export function QuizCreationMethods({ onSelect }: QuizCreationMethodsProps) {
  const t = useTranslations('Courses.CreateQuiz');

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {METHODS.map(({ id, icon: Icon }, index) => (
        <button
          key={id}
          type="button"
          onClick={() => onSelect(id)}
          className="group flex min-h-60 cursor-pointer flex-col rounded-2xl border bg-card p-6 text-left transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transform-none"
        >
          <div className="mb-8 flex items-start justify-between">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-6 w-6" aria-hidden="true" />
            </span>
            <span className="font-medium text-muted-foreground text-xs tabular-nums">
              0{index + 1}
            </span>
          </div>
          <h2 className="font-semibold text-foreground text-xl">
            {t(`methods.${id}.title`)}
          </h2>
          <p className="mt-2 flex-1 text-muted-foreground text-sm leading-6">
            {t(`methods.${id}.description`)}
          </p>
          <span className="mt-6 flex items-center gap-2 font-medium text-primary text-sm">
            {t(`methods.${id}.action`)}
            <ArrowRight
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transform-none"
              aria-hidden="true"
            />
          </span>
        </button>
      ))}
    </div>
  );
}
