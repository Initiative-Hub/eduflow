'use client';

import { useMutation } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';
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

type OneDrivePickerApiError = {
  code?: string;
  message?: string;
  status?: number;
};

function getPickerErrorMessage(
  error: OneDrivePickerApiError,
  messages: OneDrivePickerMessages
) {
  if (error.code === 'ONEDRIVE_RECONNECT_REQUIRED') {
    return messages.sessionChanged;
  }
  if (error.code === 'ONEDRIVE_NOT_CONNECTED') {
    return messages.connectRequired;
  }
  return messages.tokenFailed;
}

export function buildOneDrivePickerAuthorizationUrl(location: {
  pathname: string;
  search: string;
}) {
  const returnParams = new URLSearchParams(location.search);
  returnParams.delete('oneDrive');
  returnParams.delete('oneDriveReason');
  const query = returnParams.toString();
  const returnTo = `${location.pathname}${query ? `?${query}` : ''}`;
  const params = new URLSearchParams({ returnTo });
  return `/api/v1/integrations/onedrive/picker-authorize?${params.toString()}`;
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
  const [authorizationRequired, setAuthorizationRequired] = useState(false);
  const errorReportedRef = useRef(false);

  const closePicker = useCallback(() => setTokenContext(null), []);
  const reportError = useCallback(
    (message: string) => {
      if (errorReportedRef.current) return;
      errorReportedRef.current = true;
      onError?.(message);
    },
    [onError]
  );
  const dismissAuthorization = useCallback(
    () => setAuthorizationRequired(false),
    []
  );
  const authorizePicker = useCallback(() => {
    window.location.assign(
      buildOneDrivePickerAuthorizationUrl(window.location)
    );
  }, []);
  const handlePicked = useCallback(
    (items: OneDrivePickedItem[]) => {
      closePicker();
      onPicked(items);
    },
    [closePicker, onPicked]
  );
  const handlePickerError = useCallback(() => {
    closePicker();
    reportError(messages.unavailable);
  }, [closePicker, messages.unavailable, reportError]);

  const fetchPickerToken = useCallback(
    (input?: { command?: string; resource?: string }) =>
      apiClient.post<OneDrivePickerTokenResponse>(
        'v1/integrations/onedrive/picker-token',
        input ?? {}
      ),
    []
  );

  const handleInitialTokenError = useCallback(
    (error: OneDrivePickerApiError) => {
      closePicker();
      if (error.code === 'ONEDRIVE_PICKER_AUTHORIZATION_REQUIRED') {
        setAuthorizationRequired(true);
        return;
      }
      reportError(getPickerErrorMessage(error, messages));
    },
    [closePicker, messages, reportError]
  );

  const handleAuthenticateError = useCallback(
    (error: OneDrivePickerApiError) => {
      if (error.code !== 'ONEDRIVE_PICKER_AUTHORIZATION_REQUIRED') return;
      closePicker();
      setAuthorizationRequired(true);
    },
    [closePicker]
  );

  const { isPending: isPickerTokenPending, mutate: openWithToken } =
    useMutation({
      mutationFn: async () => fetchPickerToken(),
      onError: handleInitialTokenError,
      onSuccess: (response) => {
        setTokenContext({
          accessToken: response.data.accessToken,
          baseUrl: response.data.baseUrl,
        });
      },
    });

  const openPicker = useCallback(() => {
    errorReportedRef.current = false;
    dismissAuthorization();
    onBeforeOpen?.();
    openWithToken();
  }, [dismissAuthorization, onBeforeOpen, openWithToken]);

  const pickerProps = useMemo<OneDrivePickerHostProps | null>(() => {
    if (!tokenContext) return null;
    return {
      accessToken: tokenContext.accessToken,
      baseUrl: tokenContext.baseUrl,
      mode,
      onAuthenticate: async (input) => {
        try {
          const response = await fetchPickerToken(input);
          return response.data.accessToken;
        } catch (error) {
          handleAuthenticateError(error as OneDrivePickerApiError);
          throw error;
        }
      },
      onCanceled: closePicker,
      onError: handlePickerError,
      onPicked: handlePicked,
    };
  }, [
    closePicker,
    fetchPickerToken,
    handleAuthenticateError,
    handlePicked,
    handlePickerError,
    mode,
    tokenContext,
  ]);

  return {
    authorizationRequired,
    authorizePicker,
    dismissAuthorization,
    isConfigured: true,
    isLoading: isPickerTokenPending || Boolean(tokenContext),
    openPicker,
    pickerProps,
  };
}
