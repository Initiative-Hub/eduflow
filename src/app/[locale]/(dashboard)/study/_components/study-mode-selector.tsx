'use client';

import { BookMarked, ClipboardList, Globe } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type {
  StudyMode,
  StudyQuizOptions,
} from '@/lib/validations/study.schema';
import { StudyQuizOptionsPanel } from './study-quiz-options';

interface StudyModeSelectorProps {
  mode: StudyMode;
  quizOptions: StudyQuizOptions;
  onModeChange: (mode: StudyMode) => void;
  onQuizOptionsChange: (options: StudyQuizOptions) => void;
}

export function StudyModeSelector({
  mode,
  quizOptions,
  onModeChange,
  onQuizOptionsChange,
}: StudyModeSelectorProps) {
  const t = useTranslations('StudyPage');

  const FEATURE_CARDS = [
    {
      key: 'review' as StudyMode,
      icon: BookMarked,
      label: t('modes.review'),
      accent:
        'bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900/40',
      activeAccent: 'ring-2 ring-violet-400 bg-violet-50 dark:bg-violet-950/30',
    },
    {
      key: 'practiceTest' as StudyMode,
      icon: ClipboardList,
      label: t('modes.practiceTest'),
      accent:
        'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/40',
      activeAccent: 'ring-2 ring-indigo-400 bg-indigo-50 dark:bg-indigo-950/30',
    },
    {
      key: 'research' as StudyMode,
      icon: Globe,
      label: t('modes.research'),
      accent:
        'bg-teal-50 text-teal-600 border-teal-200 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-900/40',
      activeAccent: 'ring-2 ring-teal-400 bg-teal-50 dark:bg-teal-950/30',
    },
  ];

  return (
    <div className="flex w-full flex-col gap-6 px-4 py-8">
      {/* Header */}
      <div className="space-y-4 px-4 pt-6 text-center">
        <div className="relative flex flex-col items-center text-center">
          <h1 className="mt-5 font-black font-heading text-3xl text-foreground leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            {t.rich('title', {
              accent: (chunks) => (
                <span className="text-primary italic">{chunks}</span>
              ),
            })}
          </h1>
          <p className="mt-4 max-w-2xl text-balance text-base text-muted-foreground leading-7 sm:text-lg">
            {t('subtitle')}
          </p>
        </div>
      </div>
      {/* Mode selector */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURE_CARDS.map(
          ({ key, icon: Icon, label, accent, activeAccent }) => (
            <button
              key={key}
              type="button"
              aria-pressed={mode === key}
              onClick={() => onModeChange(key)}
              className={`cursor-pointer rounded-2xl border border-border/60 bg-card/95 p-5 text-left shadow-sm transition-[background-color,border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                mode === key ? activeAccent : ''
              }`}
            >
              <div
                className={`mb-3 flex size-10 items-center justify-center rounded-xl border ${accent}`}
              >
                <Icon className="size-5" />
              </div>
              <p className="font-bold text-foreground text-sm leading-snug">
                {label}
              </p>
              <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
                {t(`features.${key}.description`)}
              </p>
            </button>
          )
        )}
      </div>
      {mode === 'practiceTest' ? (
        <StudyQuizOptionsPanel
          options={quizOptions}
          onOptionsChange={onQuizOptionsChange}
        />
      ) : null}
    </div>
  );
}
