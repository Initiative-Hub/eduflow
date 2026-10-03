'use client';

import { useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

type PickerSession = {
  channelId: string;
  pickerWindow: Window;
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
  const [tokenContext, setTokenContext] = useState<
    | ({
        accessToken: string;
        baseUrl: string;
      } & PickerSession)
    | null
  >(null);
  const [authorizationRequired, setAuthorizationRequired] = useState(false);
  const errorReportedRef = useRef(false);
  const activeSessionRef = useRef<PickerSession | null>(null);

  const closePicker = useCallback(() => {
    activeSessionRef.current?.pickerWindow.close();
    activeSessionRef.current = null;
    setTokenContext(null);
  }, []);
  useEffect(
    () => () => {
      activeSessionRef.current?.pickerWindow.close();
      activeSessionRef.current = null;
    },
    []
  );
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
      mutationFn: async (_session: PickerSession) => fetchPickerToken(),
      onError: (error: OneDrivePickerApiError, session) => {
        if (activeSessionRef.current !== session) return;
        handleInitialTokenError(error);
      },
      onSuccess: (response, session) => {
        if (activeSessionRef.current !== session) return;
        if (session.pickerWindow.closed) {
          closePicker();
          return;
        }
        setTokenContext({
          ...session,
          accessToken: response.data.accessToken,
          baseUrl: response.data.baseUrl,
        });
      },
    });

  const openPicker = useCallback(() => {
    if (
      activeSessionRef.current &&
      !activeSessionRef.current.pickerWindow.closed
    )
      return;
    errorReportedRef.current = false;
    dismissAuthorization();
    const channelId = crypto.randomUUID();
    let pickerWindow: Window | null;
    try {
      pickerWindow = window.open(
        '',
        `OneDrivePicker-${channelId}`,
        'width=1080,height=680'
      );
    } catch {
      pickerWindow = null;
    }
    if (!pickerWindow) {
      reportError(messages.unavailable);
      return;
    }
    const session = { channelId, pickerWindow };
    activeSessionRef.current = session;
    setTokenContext(null);
    onBeforeOpen?.();
    openWithToken(session);
  }, [
    dismissAuthorization,
    messages.unavailable,
    onBeforeOpen,
    openWithToken,
    reportError,
  ]);

  const pickerProps = useMemo<OneDrivePickerHostProps | null>(() => {
    if (!tokenContext) return null;
    return {
      accessToken: tokenContext.accessToken,
      baseUrl: tokenContext.baseUrl,
      channelId: tokenContext.channelId,
      mode,
      pickerWindow: tokenContext.pickerWindow,
      onAuthenticate: async (input) => {
        try {
          const response = await fetchPickerToken(input);
          return response.data.accessToken;
        } catch (error) {
          if (activeSessionRef.current?.channelId === tokenContext.channelId) {
            handleAuthenticateError(error as OneDrivePickerApiError);
          }
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
