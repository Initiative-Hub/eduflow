'use client';

import { ArrowRight, ListOrdered, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DialogTemplate } from '@/components/custom/dialog';
import { Button } from '@/components/ui/button';

export interface NewDeckDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  slideCount: number;
  onUseExisting: () => void;
  onCreateFresh: () => void;
}

/**
 * Resilient translation helper to ensure localized keys display proper fallback
 * copy even if the server message dictionary cache is lagging behind during dev hot-reloads.
 */
function resolveText(
  translateFn: (key: string, values?: Record<string, any>) => string,
  key: string,
  fallback: string,
  values?: Record<string, any>
): string {
  try {
    const value =
      values !== undefined ? translateFn(key, values) : translateFn(key);
    // If next-intl cannot find the key, it returns the raw namespace key e.g. "Courses.LessonPresentation.key"
    if (value && !value.includes(`Courses.LessonPresentation.${key}`)) {
      return value;
    }
  } catch {
    // Fall back gracefully
  }
  return fallback;
}

export function NewDeckDialog({
  isOpen,
  onOpenChange,
  slideCount,
  onUseExisting,
  onCreateFresh,
}: NewDeckDialogProps) {
  const t = useTranslations('Courses.LessonPresentation');

  const title = resolveText(t, 'newDeckDialogTitle', 'Create New Presentation');
  const description = resolveText(
    t,
    'newDeckDialogDesc',
    'Choose whether to reuse your existing slide outline or generate a new one from scratch.'
  );
  const cancelText = resolveText(t, 'cancel', 'Cancel');

  const useExistingTitle = resolveText(
    t,
    'newDeckUseExistingTitle',
    'Use Previous Outline'
  );
  const useExistingDesc = resolveText(
    t,
    'newDeckUseExistingDesc',
    `Keep your ${slideCount} planned slide${slideCount === 1 ? '' : 's'} to adjust layouts, edit content, or try different styles.`,
    { count: slideCount }
  );

  const createFreshTitle = resolveText(
    t,
    'newDeckCreateFreshTitle',
    'Generate New Outline'
  );
  const createFreshDesc = resolveText(
    t,
    'newDeckCreateFreshDesc',
    'Write a new prompt and set duration to generate a completely fresh slide structure.'
  );

  return (
    <DialogTemplate
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      className="sm:max-w-xl"
      footer={
        <Button
          type="button"
          variant="ghost"
          onClick={() => onOpenChange(false)}
          className="w-full sm:w-auto"
        >
          {cancelText}
        </Button>
      }
    >
      <div className="flex flex-col gap-3 py-1">
        {/* Option 1: Use Existing Outline */}
        <button
          type="button"
          onClick={onUseExisting}
          className="group flex w-full items-start gap-3.5 rounded-xl border border-border/70 bg-card/60 p-4 text-left transition-all duration-200 hover:border-primary/50 hover:bg-accent/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors duration-200 group-hover:bg-primary group-hover:text-primary-foreground">
            <ListOrdered className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-foreground text-sm">
              {useExistingTitle}
            </span>
            <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
              {useExistingDesc}
            </p>
          </div>
          <div className="mt-1 shrink-0 text-muted-foreground/50 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary">
            <ArrowRight className="size-4" />
          </div>
        </button>

        {/* Option 2: Generate New Outline */}
        <button
          type="button"
          onClick={onCreateFresh}
          className="group flex w-full items-start gap-3.5 rounded-xl border border-border/70 bg-card/60 p-4 text-left transition-all duration-200 hover:border-primary/50 hover:bg-accent/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 transition-colors duration-200 group-hover:bg-amber-600 group-hover:text-white dark:text-amber-400">
            <Sparkles className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-foreground text-sm">
              {createFreshTitle}
            </span>
            <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
              {createFreshDesc}
            </p>
          </div>
          <div className="mt-1 shrink-0 text-muted-foreground/50 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary">
            <ArrowRight className="size-4" />
          </div>
        </button>
      </div>
    </DialogTemplate>
  );
}
