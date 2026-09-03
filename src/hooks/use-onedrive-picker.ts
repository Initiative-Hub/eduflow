'use client';

import { useMutation } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import type {
  OneDrivePickedItem,
  OneDrivePickerHostProps,
} from '@/components/onedrive-picker/onedrive-picker-host';
import { apiClient } from '@/lib/api';

type OneDrivePickerTokenResponse = {
  data: {
    accessToken: string;
    accountEmail: string | null;
    baseUrl: string;
    expiresAt: string | null;
  };
};

type OneDrivePickerMessages = {
  connectRequired: string;
  sessionChanged: string;
  tokenFailed: string;
  unavailable: string;
};

function getPickerErrorMessage(
  error: { message?: string; status?: number },
  messages: OneDrivePickerMessages
) {
  if (error.status === 409 || error.message === 'OneDrive is not connected.') {
    return messages.connectRequired;
  }
  if (error.message === 'OneDrive OAuth session changed.') {
    return messages.sessionChanged;
  }
  return messages.tokenFailed;
}

export function useOneDrivePicker({
  messages = {
    connectRequired: 'Connect OneDrive first.',
    sessionChanged: 'OneDrive session changed. Reconnect OneDrive.',
    tokenFailed: 'Could not prepare OneDrive Picker.',
    unavailable: 'OneDrive Picker is unavailable.',
  },
  mode = 'files',
  onBeforeOpen,
  onError,
  onPicked,
}: {
  messages?: OneDrivePickerMessages;
  mode?: 'files' | 'folder';
  onBeforeOpen?: () => void;
  onError?: (message: string) => void;
  onPicked: (items: OneDrivePickedItem[]) => void;
}) {
  const [tokenContext, setTokenContext] = useState<{
    accessToken: string;
    baseUrl: string;
  } | null>(null);

  const closePicker = useCallback(() => setTokenContext(null), []);
  const handlePicked = useCallback(
    (items: OneDrivePickedItem[]) => {
      closePicker();
      onPicked(items);
    },
    [closePicker, onPicked]
  );
  const handlePickerError = useCallback(() => {
    closePicker();
    onError?.(messages.unavailable);
  }, [closePicker, messages.unavailable, onError]);

  const fetchPickerToken = useCallback(
    (input?: { command?: string; resource?: string }) =>
      apiClient.post<OneDrivePickerTokenResponse>(
        'v1/integrations/onedrive/picker-token',
        input ?? {}
      ),
    []
  );

  const { isPending: isPickerTokenPending, mutate: openWithToken } =
    useMutation({
      mutationFn: async () => fetchPickerToken(),
      onError: (error: { message?: string; status?: number }) => {
        closePicker();
        onError?.(getPickerErrorMessage(error, messages));
      },
      onSuccess: (response) => {
        setTokenContext({
          accessToken: response.data.accessToken,
          baseUrl: response.data.baseUrl,
        });
      },
    });

  const openPicker = useCallback(() => {
    onBeforeOpen?.();
    openWithToken();
  }, [onBeforeOpen, openWithToken]);

  const pickerProps = useMemo<OneDrivePickerHostProps | null>(() => {
    if (!tokenContext) return null;
    return {
      accessToken: tokenContext.accessToken,
      baseUrl: tokenContext.baseUrl,
      mode,
      onAuthenticate: async (input) => {
        const response = await fetchPickerToken(input);
        return response.data.accessToken;
      },
      onCanceled: closePicker,
      onError: handlePickerError,
      onPicked: handlePicked,
    };
  }, [
    closePicker,
    fetchPickerToken,
    handlePicked,
    handlePickerError,
    mode,
    tokenContext,
  ]);

  return {
    isConfigured: true,
    isLoading: isPickerTokenPending || Boolean(tokenContext),
    openPicker,
    pickerProps,
  };
}
