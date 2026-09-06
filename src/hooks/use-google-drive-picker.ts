'use client';

import { useMutation } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import type { GoogleDrivePickerHostProps } from '@/components/google-drive-picker/google-drive-picker-host';
import { apiClient } from '@/lib/api';

type GoogleDrivePickerTokenResponse = {
  data: {
    accessToken: string;
    accountEmail: string | null;
    expiresAt: string | null;
  };
};

type GoogleDrivePickerMode = 'files' | 'folder';

type GoogleDrivePickerMessages = {
  connectRequired: string;
  notConfigured: string;
  sessionChanged: string;
  tokenFailed: string;
  unavailable: string;
};

function getPickerErrorMessage(
  error: { message?: string; status?: number },
  messages: GoogleDrivePickerMessages
) {
  if (
    error.status === 409 ||
    error.message === 'Google Drive is not connected.'
  ) {
    return messages.connectRequired;
  }
  if (error.message === 'Google Drive OAuth session changed.') {
    return messages.sessionChanged;
  }
  return messages.tokenFailed;
}

export function useGoogleDrivePicker({
  messages = {
    connectRequired: 'Connect Google Drive first.',
    notConfigured: 'Google Drive Picker is not configured.',
    sessionChanged: 'Google Drive session changed. Reconnect Google Drive.',
    tokenFailed: 'Could not prepare Google Drive Picker.',
    unavailable: 'Google Drive Picker is unavailable.',
  },
  mode = 'files',
  onBeforeOpen,
  onError,
  onPicked,
}: {
  messages?: GoogleDrivePickerMessages;
  mode?: GoogleDrivePickerMode;
  onBeforeOpen?: () => void;
  onError?: (message: string) => void;
  onPicked: (fileIds: string[]) => void;
}) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PICKER_API_KEY;
  const appId = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_APP_ID;
  const isConfigured = Boolean(apiKey && appId);

  const closePicker = useCallback(() => setAccessToken(null), []);
  const handlePicked = useCallback(
    (fileIds: string[]) => {
      closePicker();
      onPicked(fileIds);
    },
    [closePicker, onPicked]
  );
  const handlePickerError = useCallback(() => {
    closePicker();
    onError?.(messages.unavailable);
  }, [closePicker, messages.unavailable, onError]);

  const { isPending: isPickerTokenPending, mutate: fetchPickerToken } =
    useMutation({
      mutationFn: async () =>
        apiClient.get<GoogleDrivePickerTokenResponse>(
          'v1/integrations/google-drive/picker-token'
        ),
      onError: (error: { message?: string; status?: number }) => {
        closePicker();
        onError?.(getPickerErrorMessage(error, messages));
      },
      onSuccess: (response) => {
        setAccessToken(response.data.accessToken);
      },
    });

  const openPicker = useCallback(() => {
    if (!isConfigured || !apiKey || !appId) {
      onError?.(messages.notConfigured);
      return;
    }
    onBeforeOpen?.();
    fetchPickerToken();
  }, [
    apiKey,
    appId,
    fetchPickerToken,
    isConfigured,
    messages.notConfigured,
    onBeforeOpen,
    onError,
  ]);

  const pickerProps = useMemo<GoogleDrivePickerHostProps | null>(() => {
    if (!accessToken || !apiKey || !appId) return null;
    return {
      accessToken,
      apiKey,
      appId,
      mode,
      onCanceled: closePicker,
      onError: handlePickerError,
      onPicked: handlePicked,
    };
  }, [
    accessToken,
    apiKey,
    appId,
    closePicker,
    handlePicked,
    handlePickerError,
    mode,
  ]);

  return {
    isConfigured,
    isLoading: isPickerTokenPending || Boolean(accessToken),
    openPicker,
    pickerProps,
  };
}
