'use client';

import { useMutation } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useRef } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import type { GoogleDriveExportSource } from '@/lib/validations/google-drive-export.schema';

export type GoogleDriveExportResult = {
  destination: {
    driveId: string | null;
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

export function useGoogleDriveExport() {
  const t = useTranslations('GoogleDriveExport');
  const locale = useLocale();
  const requestIds = useRef(new WeakMap<object, string>());

  return useMutation({
    mutationFn: async (source: GoogleDriveExportSource) => {
      let requestId = requestIds.current.get(source);
      if (!requestId) {
        requestId = crypto.randomUUID();
        requestIds.current.set(source, requestId);
      }
      return apiClient.post<{ data: GoogleDriveExportResult }>(
        'v1/integrations/google-drive/exports',
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
    onSettled: (_data, _error, source) => {
      requestIds.current.delete(source);
    },
    onSuccess: ({ data }) => {
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
