'use client';

import { Download, Loader2, Maximize2, RefreshCw, Save } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { StudyInteractiveContentData } from '@/utils/study-interactive-content';
import { useInteractiveContentPreview } from './use-interactive-content-preview';

const InteractiveContentPreview = ({
  title,
  description,
  html,
}: StudyInteractiveContentData) => {
  const t = useTranslations('StudyPage.features.interactiveContent');
  const {
    containerRef,
    handleDownload,
    handleFullscreen,
    handleReset,
    handleSaveToInventory,
    isSavingToInventory,
    previewKey,
    secureDocument,
  } = useInteractiveContentPreview({
    html,
    saveErrorMessage: t('saveError'),
    saveSuccessMessage: t('saveSuccess'),
    title,
  });

  return (
    <section
      ref={containerRef}
      className="w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
    >
      <header className="flex flex-col gap-4 border-border border-b p-4">
        <div className="w-full min-w-0">
          <h2 className="font-semibold text-foreground text-lg">{title}</h2>
          {description ? (
            <p className="mt-1 text-muted-foreground text-sm leading-relaxed">
              {description}
            </p>
          ) : null}
        </div>

        <fieldset className="m-0 flex w-full min-w-0 flex-wrap items-center gap-2 border-0 p-0">
          <legend className="sr-only">{t('actionsLabel')}</legend>
          <button
            type="button"
            className="inline-flex h-9 min-w-36 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 font-medium text-foreground text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={handleReset}
          >
            <RefreshCw className="size-4" />
            <span>{t('reset')}</span>
          </button>

          <button
            type="button"
            className="inline-flex h-9 min-w-36 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 font-medium text-foreground text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={handleFullscreen}
          >
            <Maximize2 className="size-4" />
            <span>{t('fullscreen')}</span>
          </button>

          <button
            type="button"
            className="inline-flex h-9 min-w-36 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 font-medium text-foreground text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={handleDownload}
          >
            <Download className="size-4" />
            <span>{t('download')}</span>
          </button>
          <button
            type="button"
            className="inline-flex h-9 min-w-36 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 font-medium text-foreground text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleSaveToInventory}
            disabled={isSavingToInventory}
          >
            {isSavingToInventory ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            <span>
              {isSavingToInventory
                ? t('savingToInventory')
                : t('saveToInventory')}
            </span>
          </button>
        </fieldset>
      </header>
      <iframe
        key={previewKey}
        className="h-[clamp(45rem,85vh,60rem)] w-full bg-background"
        referrerPolicy="no-referrer"
        sandbox="allow-scripts"
        srcDoc={secureDocument}
        title={t('previewTitle', { title })}
      />
    </section>
  );
};
export default InteractiveContentPreview;
