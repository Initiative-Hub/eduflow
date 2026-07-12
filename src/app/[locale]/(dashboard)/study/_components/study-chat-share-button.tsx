import { useMutation } from '@tanstack/react-query';
import {
  AlertCircle,
  Check,
  Copy,
  Loader2,
  RefreshCw,
  Share2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { DialogTemplate } from '@/components/custom/dialog';
import { Button } from '@/components/ui/button';
import { studyService } from '../study.service';

type StudyChatShareButtonProps = {
  chatId: string;
  disabled?: boolean;
};

export function StudyChatShareButton({
  chatId,
  disabled = false,
}: StudyChatShareButtonProps) {
  const t = useTranslations('StudyPage.sharedChat');
  const [isOpen, setIsOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const shareMutation = useMutation({
    mutationFn: () => studyService.shareChat(chatId),
    onSuccess: ({ shareUrl: nextShareUrl }) => {
      setShareUrl(nextShareUrl);
      setShareError(null);
      setIsCopied(false);
    },
    onError: () => {
      setShareError(t('shareError'));
      toast.error(t('shareError'));
    },
  });

  const createShareLink = () => {
    setIsOpen(true);
    setShareUrl(null);
    setShareError(null);
    setIsCopied(false);
    shareMutation.mutate();
  };

  const copyShareLink = async () => {
    if (!shareUrl || !navigator.clipboard?.writeText) {
      setShareError(t('copyError'));
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      setShareError(null);
      toast.success(t('shareSuccess'));
    } catch {
      setShareError(t('copyError'));
      toast.error(t('copyError'));
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || shareMutation.isPending}
        onClick={createShareLink}
      >
        {shareMutation.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Share2 className="size-4" />
        )}
        <span>{t('share')}</span>
      </Button>

      <DialogTemplate
        isOpen={isOpen}
        onOpenChange={setIsOpen}
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
                disabled={shareMutation.isPending}
                onClick={() => shareMutation.mutate()}
              >
                <RefreshCw className="size-4" />
                <span>{t('retry')}</span>
              </Button>
            ) : null}

            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              {t('close')}
            </Button>

            <Button
              type="button"
              disabled={!shareUrl || shareMutation.isPending}
              onClick={() => void copyShareLink()}
            >
              {isCopied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
              <span>{isCopied ? t('copied') : t('copyLink')}</span>
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {shareMutation.isPending ? (
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
              <p className="font-medium text-sm">{t('shareLinkLabel')}</p>
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="break-all font-mono text-muted-foreground text-xs">
                  {shareUrl}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </DialogTemplate>
    </>
  );
}
