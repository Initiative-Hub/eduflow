'use client';

import { useMutation } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useRef } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import type { OneDriveExportSource } from '@/lib/validations/onedrive-export.schema';

export type OneDriveExportResult = {
  destination: {
    driveId: string;
    folderId: string | null;
    kind: 'my_drive' | 'folder';
    name: string;
    webViewLink: string | null;
  };
  fileId: string;
  mimeType: string;
  name: string;
  reused: boolean;
  size: number | null;
  webViewLink: string | null;
};

type ExportError = {
  code?: string;
  details?: { reason?: string };
  message?: string;
};

const DESTINATION_ERROR_CODES = new Set([
  'DRIVE_NOT_CONNECTED',
  'DRIVE_DESTINATION_REQUIRED',
  'DRIVE_DESTINATION_NOT_WRITABLE',
  'DRIVE_DESTINATION_UNAVAILABLE',
]);

export function useOneDriveExport() {
  const t = useTranslations('OneDriveExport');
  const locale = useLocale();
  const requestIds = useRef(new Map<string, string>());

  return useMutation({
    mutationFn: async (source: OneDriveExportSource) => {
      const sourceKey = JSON.stringify(source);
      let requestId = requestIds.current.get(sourceKey);
      if (!requestId) {
        requestId = crypto.randomUUID();
        requestIds.current.set(sourceKey, requestId);
      }
      return apiClient.post<{ data: OneDriveExportResult }>(
        'v1/integrations/onedrive/exports',
        { requestId, source },
        { timeout: 300_000 }
      );
    },
    onError: (error: ExportError) => {
      const isLegacyGamma = error.details?.reason === 'LEGACY_GAMMA';
      const needsSetup = Boolean(
        error.code && DESTINATION_ERROR_CODES.has(error.code)
      );
      toast.error(
        isLegacyGamma
          ? t('legacyGamma')
          : needsSetup
            ? t('destinationError')
            : t('failed'),
        {
          action: needsSetup
            ? {
                label: t('openIntegrations'),
                onClick: () => {
                  window.location.assign(`/${locale}/settings/integrations`);
                },
              }
            : undefined,
          description: isLegacyGamma ? undefined : error.message,
        }
      );
    },
    onSuccess: ({ data }, source) => {
      requestIds.current.delete(JSON.stringify(source));
      toast.success(t('success'), {
        action: data.webViewLink
          ? {
              label: t('openInDrive'),
              onClick: () => {
                window.open(data.webViewLink ?? '', '_blank', 'noopener');
              },
            }
          : undefined,
        description: t('savedTo', { destination: data.destination.name }),
      });
    },
  });
}
