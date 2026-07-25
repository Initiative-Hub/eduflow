'use client';

import { useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';

const GOOGLE_API_SCRIPT = 'https://apis.google.com/js/api.js';

type GoogleDrivePickerTokenResponse = {
  data: {
    accessToken: string;
    accountEmail: string | null;
    expiresAt: string | null;
  };
};

type GoogleDrivePickerDocument = Record<string, string | undefined>;

type GoogleDrivePickerData = Record<
  string,
  string | GoogleDrivePickerDocument[] | undefined
>;

type GoogleDrivePickerMode = 'files' | 'folder';

type GoogleDrivePickerMessages = {
  connectRequired: string;
  notConfigured: string;
  sessionChanged: string;
  stillLoading: string;
  tokenFailed: string;
  unavailable: string;
};

declare global {
  interface Window {
    gapi?: {
      load: (name: string, callback: () => void) => void;
    };
    google?: {
      picker?: any;
    };
  }
}

let googleApiScriptPromise: Promise<void> | null = null;
let googlePickerPromise: Promise<void> | null = null;

function loadScript(src: string, id: string) {
  const existing = document.getElementById(id);
  if (existing) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.async = true;
    script.defer = true;
    script.id = id;
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Could not load ${src}`));
    document.head.appendChild(script);
  });
}

function loadGoogleApiScript() {
  googleApiScriptPromise ??= loadScript(GOOGLE_API_SCRIPT, 'google-api-script');
  return googleApiScriptPromise;
}

async function loadGooglePicker() {
  await loadGoogleApiScript();
  googlePickerPromise ??= new Promise<void>((resolve, reject) => {
    if (!window.gapi) {
      reject(new Error('Google API loader is unavailable.'));
      return;
    }

    window.gapi.load('picker', resolve);
  });

  return googlePickerPromise;
}

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
    stillLoading: 'Google Drive Picker is still loading.',
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
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PICKER_API_KEY;
  const appId = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_APP_ID;
  const isConfigured = Boolean(apiKey && appId);

  useEffect(() => {
    if (!isConfigured) return;

    let cancelled = false;

    const initialize = async () => {
      try {
        await loadGooglePicker();
        if (cancelled) return;

        setIsReady(true);
      } catch (error) {
        if (cancelled) return;
        onError?.(
          error instanceof Error
            ? error.message
            : 'Could not initialize Google Drive Picker.'
        );
      }
    };

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [isConfigured, onError]);

  const showPicker = useCallback(
    (accessToken: string) => {
      const pickerApi = window.google?.picker;
      if (!pickerApi) {
        setIsPickerOpen(false);
        onError?.(messages.unavailable);
        return;
      }

      const docsView =
        mode === 'folder'
          ? new pickerApi.DocsView(pickerApi.ViewId.FOLDERS)
              .setIncludeFolders(true)
              .setSelectFolderEnabled(true)
              .setMode(pickerApi.DocsViewMode.LIST)
          : new pickerApi.DocsView(pickerApi.ViewId.DOCS).setMode(
              pickerApi.DocsViewMode.LIST
            );
      const picker = new pickerApi.PickerBuilder()
        .addView(docsView)
        .setOAuthToken(accessToken)
        .setDeveloperKey(apiKey)
        .setAppId(appId)
        .setOrigin(window.location.origin)
        .setCallback((data: GoogleDrivePickerData) => {
          const action = data[pickerApi.Response.ACTION];
          if (action === pickerApi.Action.PICKED) {
            const docs = data[pickerApi.Response.DOCUMENTS];
            const fileIds = Array.isArray(docs)
              ? docs.flatMap((doc) => {
                  const id = doc[pickerApi.Document.ID];
                  return id ? [id] : [];
                })
              : [];
            onPicked(fileIds);
            setIsPickerOpen(false);
          }

          if (action === pickerApi.Action.CANCEL) {
            setIsPickerOpen(false);
          }
        })
        .build();

      picker.setVisible(true);
    },
    [apiKey, appId, messages.unavailable, mode, onError, onPicked]
  );

  const { isPending: isPickerTokenPending, mutate: fetchPickerToken } =
    useMutation({
      mutationFn: async () =>
        apiClient.get<GoogleDrivePickerTokenResponse>(
          'v1/integrations/google-drive/picker-token'
        ),
      onError: (error: { message?: string; status?: number }) => {
        setIsPickerOpen(false);
        onError?.(getPickerErrorMessage(error, messages));
      },
      onSuccess: (response) => {
        showPicker(response.data.accessToken);
      },
    });

  const openPicker = useCallback(() => {
    if (!isConfigured || !apiKey || !appId) {
      onError?.(messages.notConfigured);
      return;
    }

    if (!isReady) {
      onError?.(messages.stillLoading);
      return;
    }

    onBeforeOpen?.();
    setIsPickerOpen(true);
    fetchPickerToken();
  }, [
    apiKey,
    appId,
    fetchPickerToken,
    isConfigured,
    isReady,
    messages.notConfigured,
    messages.stillLoading,
    onBeforeOpen,
    onError,
  ]);

  return {
    isConfigured,
    isLoading: isPickerTokenPending || isPickerOpen,
    isReady,
    openPicker,
  };
}
