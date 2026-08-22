'use client';

import {
  AlertCircle,
  Check,
  CloudUpload,
  Copy,
  Download,
  Loader2,
  Maximize2,
  RefreshCw,
  Save,
  Share2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { DialogTemplate } from '@/components/custom/dialog';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
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
    handleCopyShareLink,
    handleDownload,
    handleFullscreen,
    handleReset,
    handleSaveToDrive,
    handleSaveToInventory,
    handleShare,
    isSavingToInventory,
    isSavingToDrive,
    isShareCopied,
    isShareDialogOpen,
    isSharing,
    previewKey,
    secureDocument,
    setIsShareDialogOpen,
    shareError,
    shareUrl,
  } = useInteractiveContentPreview({
    copyErrorMessage: t('copyError'),
    copySuccessMessage: t('shareSuccess'),
    description,
    html,
    saveErrorMessage: t('saveError'),
    saveSuccessMessage: t('saveSuccess'),
    share,
    shareErrorMessage: t('shareError'),
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
              label={isSavingToDrive ? t('savingToDrive') : t('saveToDrive')}
              onClick={handleSaveToDrive}
              disabled={isSavingToDrive}
            >
              {isSavingToDrive ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CloudUpload className="size-4" />
              )}
            </PreviewActionButton>
          ) : null}

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
      </header>

      <iframe
        key={previewKey}
        className="h-[clamp(45rem,85vh,60rem)] w-full bg-background"
        referrerPolicy="no-referrer"
        sandbox="allow-scripts"
        srcDoc={secureDocument}
        title={t('previewTitle', { title })}
      />
      {share ? (
        <DialogTemplate
          isOpen={isShareDialogOpen}
          onOpenChange={setIsShareDialogOpen}
          title={t('shareDialogTitle')}
          description={
            shareUrl
              ? t('shareDialogReadyDescription')
              : t('shareDialogDescription')
          }
          className="sm:max-w-md"
          footer={
            <>
              {shareError && !shareUrl ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleShare}
                  disabled={isSharing}
                >
                  <RefreshCw className="size-4" />
                  <span>{t('retry')}</span>
                </Button>
              ) : null}

              <Button
                type="button"
                variant="outline"
                onClick={() => setIsShareDialogOpen(false)}
              >
                {t('close')}
              </Button>

              <Button
                type="button"
                onClick={() => void handleCopyShareLink()}
                disabled={!shareUrl || isSharing}
              >
                {isShareCopied ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
                <span>{isShareCopied ? t('copied') : t('copyLink')}</span>
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            {isSharing ? (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
                <Loader2 className="size-4 animate-spin text-primary" />
                <p className="font-medium text-sm">{t('shareGenerating')}</p>
              </div>
            ) : null}

            {shareError ? (
              <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <p className="text-sm">{shareError}</p>
              </div>
            ) : null}

            {shareUrl ? (
              <div className="space-y-2">
                <p className="font-medium text-foreground text-sm">
                  {t('shareLinkLabel')}
                </p>
                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <p className="break-all font-mono text-muted-foreground text-xs leading-relaxed">
                    {shareUrl}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </DialogTemplate>
      ) : null}
    </section>
  );
};

export default InteractiveContentPreview;
