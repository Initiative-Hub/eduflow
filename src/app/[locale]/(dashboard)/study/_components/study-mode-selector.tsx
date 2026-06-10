'use client';

import {
  BookMarked,
  BookOpen,
  ClipboardList,
  CloudUpload,
  Tag,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Dropzone } from '@/components/ui/dropzone';
import type { StudyMode } from '@/lib/validations/study.schema';

interface StudyModeSelectorProps {
  mode: StudyMode;
  onModeChange: (mode: StudyMode) => void;
  onSelectPrompt: (text: string) => void;
}

const EXAMPLE_PROMPTS: Record<StudyMode, string[]> = {
  review: [
    'Summarise the key concepts of photosynthesis',
    'Create a study guide for World War II causes',
    "Explain the main ideas in Newton's laws of motion",
  ],
  practiceTest: [
    'Generate a practice test on the French Revolution',
    'Create quiz questions about Python data structures',
    'Make flashcards for Spanish vocabulary – food and drink',
  ],
  keywords: [
    'Extract key terms from: Machine Learning uses algorithms…',
    'Define keywords in: The mitochondria is the powerhouse…',
    'Find key concepts in microeconomics supply and demand',
  ],
};

export function StudyModeSelector({
  mode,
  onModeChange,
  onSelectPrompt,
}: StudyModeSelectorProps) {
  const t = useTranslations('StudyPage');
  const [files, setFiles] = useState<File[]>();

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
      key: 'keywords' as StudyMode,
      icon: Tag,
      label: t('modes.keywords'),
      accent:
        'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40',
      activeAccent: 'ring-2 ring-amber-400 bg-amber-50 dark:bg-amber-950/30',
    },
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {FEATURE_CARDS.map(
          ({ key, icon: Icon, label, accent, activeAccent }) => (
            <button
              key={key}
              type="button"
              onClick={() => onModeChange(key)}
              className={`cursor-pointer rounded-2xl border border-border/60 bg-card/95 p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
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
      {/* Example prompts */}
      <div className="flex flex-col gap-2">
        <p className="px-1 font-medium text-muted-foreground text-xs">
          {t('input.examples')}
        </p>
        <div className="flex flex-col gap-2">
          {EXAMPLE_PROMPTS[mode].map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onSelectPrompt(prompt)}
              className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/40 px-4 py-2.5 text-left text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
            >
              <BookOpen className="size-3.5 shrink-0" />
              {prompt}
            </button>
          ))}
        </div>
      </div>
      {/* Upload zone */}
      <Dropzone
        src={files}
        maxFiles={10}
        accept={{
          'application/pdf': ['.pdf'],
          'application/msword': ['.doc'],
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
            ['.docx'],
          'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
        }}
        onDrop={(acceptedFiles) =>
          setFiles((prev) => [...(prev ?? []), ...acceptedFiles])
        }
        className="min-h-36 rounded-2xl"
      >
        {files && files.length > 0 ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-border/60 bg-background shadow-sm">
              <CloudUpload className="size-5 text-primary" />
            </div>
            <p className="font-semibold text-foreground text-sm">
              {files.length === 1
                ? files[0].name
                : `${files.length} files selected`}
            </p>
            <p className="text-muted-foreground text-xs">
              {t('upload.replace')}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-border/60 bg-background shadow-sm">
              <CloudUpload className="size-5 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground text-lg">
              {t('upload.title')}
            </p>
            <p className="text-muted-foreground text-sm">
              {t('upload.description')}
            </p>
          </div>
        )}
      </Dropzone>
    </div>
  );
}
