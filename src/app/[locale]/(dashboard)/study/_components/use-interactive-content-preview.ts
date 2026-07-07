'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  createInteractiveContentDownloadFilename,
  createInteractiveContentInventoryFile,
  createSecureInteractiveContentDocument,
} from '@/utils/study-interactive-content-document';
import { inventoryService } from '../../inventory/inventory.service';
import { studyService } from '../study.service';

type InteractiveContentShareInput = {
  chatId: string;
  messageId: string;
  contentIndex: number;
};

type UseInteractiveContentPreviewOptions = {
  description: string;
  html: string;
  title: string;
  saveErrorMessage: string;
  saveSuccessMessage: string;
  share?: InteractiveContentShareInput;
  copyErrorMessage?: string;
  copySuccessMessage?: string;
  shareErrorMessage?: string;
};

export function useInteractiveContentPreview({
  description,
  html,
  title,
  saveErrorMessage,
  saveSuccessMessage,
  share,
  copyErrorMessage = 'Could not copy share link.',
  copySuccessMessage = 'Share link copied.',
  shareErrorMessage = 'Could not create share link.',
}: UseInteractiveContentPreviewOptions) {
  const containerRef = useRef<HTMLElement>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [isShareCopied, setIsShareCopied] = useState(false);
  const secureDocument = useMemo(
    () => createSecureInteractiveContentDocument(html),
    [html]
  );
  const queryClient = useQueryClient();

  const saveToInventoryMutation = useMutation({
    mutationFn: async () => {
      const file = createInteractiveContentInventoryFile({
        html: secureDocument,
        title,
      });

      return inventoryService.upload({ file });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['inventory'],
      });

      toast.success(saveSuccessMessage);
    },
    onError: () => {
      toast.error(saveErrorMessage);
    },
  });

  const shareMutation = useMutation({
    mutationFn: async () => {
      if (!share) {
        throw new Error(shareErrorMessage);
      }

      return studyService.shareInteractiveContent(share.chatId, {
        content: {
          description,
          html,
          title,
        },
        messageId: share.messageId,
        contentIndex: share.contentIndex,
      });
    },
    onSuccess: ({ shareUrl }) => {
      setShareUrl(shareUrl);
      setShareError(null);
      setIsShareCopied(false);
    },
    onError: () => {
      setShareError(shareErrorMessage);
      toast.error(shareErrorMessage);
    },
  });

  const handleReset = () => {
    setPreviewKey((currentKey) => currentKey + 1);
  };

  const handleSaveToInventory = () => {
    saveToInventoryMutation.mutate();
  };

  const handleShare = () => {
    setIsShareDialogOpen(true);
    setShareUrl(null);
    setShareError(null);
    setIsShareCopied(false);
    shareMutation.mutate();
  };

  const handleCopyShareLink = async () => {
    if (!shareUrl) return;

    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      setShareError(copyErrorMessage);
      toast.error(copyErrorMessage);
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsShareCopied(true);
      setShareError(null);
      toast.success(copySuccessMessage);
    } catch {
      setShareError(copyErrorMessage);
      toast.error(copyErrorMessage);
    }
  };

  const handleFullscreen = () => {
    const container = containerRef.current;

    if (!container) return;

    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    }

    void container.requestFullscreen().catch(() => undefined);
  };

  const handleDownload = () => {
    const blob = new Blob([secureDocument], {
      type: 'text/html;charset=utf-8',
    });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = downloadUrl;
    anchor.download = createInteractiveContentDownloadFilename(title);
    anchor.click();

    URL.revokeObjectURL(downloadUrl);
  };

  return {
    containerRef,
    handleDownload,
    handleCopyShareLink,
    handleFullscreen,
    handleReset,
    handleSaveToInventory,
    handleShare,
    isSavingToInventory: saveToInventoryMutation.isPending,
    isShareCopied,
    isShareDialogOpen,
    isSharing: shareMutation.isPending,
    previewKey,
    secureDocument,
    setIsShareDialogOpen,
    shareError,
    shareUrl,
  };
}
