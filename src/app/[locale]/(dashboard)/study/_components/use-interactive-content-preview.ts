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
  html: string;
  title: string;
  saveErrorMessage: string;
  saveSuccessMessage: string;
  share?: InteractiveContentShareInput;
  shareErrorMessage?: string;
  shareSuccessMessage?: string;
};

export function useInteractiveContentPreview({
  html,
  title,
  saveErrorMessage,
  saveSuccessMessage,
  share,
  shareErrorMessage = 'Could not create share link.',
  shareSuccessMessage = 'Share link copied.',
}: UseInteractiveContentPreviewOptions) {
  const containerRef = useRef<HTMLElement>(null);
  const [previewKey, setPreviewKey] = useState(0);
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
        messageId: share.messageId,
        contentIndex: share.contentIndex,
      });
    },
    onSuccess: async ({ shareUrl }) => {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(shareSuccessMessage);
    },
    onError: () => {
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
    shareMutation.mutate();
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
    handleFullscreen,
    handleReset,
    handleSaveToInventory,
    handleShare,
    isSavingToInventory: saveToInventoryMutation.isPending,
    isSharing: shareMutation.isPending,
    previewKey,
    secureDocument,
  };
}
