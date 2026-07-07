'use client';

import {
  Download,
  Loader2,
  Maximize2,
  RefreshCw,
  Save,
  Share2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { StudyInteractiveContentData } from '@/utils/study-interactive-content';
import { useInteractiveContentPreview } from './use-interactive-content-preview';

type InteractiveContentPreviewProps = StudyInteractiveContentData & {
  share?: {
    chatId: string;
    messageId: string;
    contentIndex: number;
  };
  showSaveToInventory?: boolean;
};

type PreviewActionButtonProps = {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
};

function PreviewActionButton({
  children,
  disabled,
  label,
  onClick,
}: PreviewActionButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          onClick={onClick}
          disabled={disabled}
        >
          {children}
          <span className="sr-only">{label}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}

const InteractiveContentPreview = ({
  title,
  description,
  html,
  share,
  showSaveToInventory = true,
}: InteractiveContentPreviewProps) => {
  const t = useTranslations('StudyPage.features.interactiveContent');
  const {
    containerRef,
    handleDownload,
    handleFullscreen,
    handleReset,
    handleSaveToInventory,
    handleShare,
    isSavingToInventory,
    isSharing,
    previewKey,
    secureDocument,
  } = useInteractiveContentPreview({
    html,
    saveErrorMessage: t('saveError'),
    saveSuccessMessage: t('saveSuccess'),
    share,
    shareErrorMessage: t('shareError'),
    shareSuccessMessage: t('shareSuccess'),
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

        <TooltipProvider>
          <fieldset className="m-0 flex w-full min-w-0 flex-wrap items-center gap-2 border-0 p-0">
            <legend className="sr-only">{t('actionsLabel')}</legend>

            <PreviewActionButton label={t('reset')} onClick={handleReset}>
              <RefreshCw className="size-4" />
            </PreviewActionButton>

            <PreviewActionButton
              label={t('fullscreen')}
              onClick={handleFullscreen}
            >
              <Maximize2 className="size-4" />
            </PreviewActionButton>

            <PreviewActionButton label={t('download')} onClick={handleDownload}>
              <Download className="size-4" />
            </PreviewActionButton>

            {share ? (
              <PreviewActionButton
                label={isSharing ? t('sharing') : t('share')}
                onClick={handleShare}
                disabled={isSharing}
              >
                {isSharing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Share2 className="size-4" />
                )}
              </PreviewActionButton>
            ) : null}

            {showSaveToInventory ? (
              <PreviewActionButton
                label={
                  isSavingToInventory
                    ? t('savingToInventory')
                    : t('saveToInventory')
                }
                onClick={handleSaveToInventory}
                disabled={isSavingToInventory}
              >
                {isSavingToInventory ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
              </PreviewActionButton>
            ) : null}
          </fieldset>
        </TooltipProvider>
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
