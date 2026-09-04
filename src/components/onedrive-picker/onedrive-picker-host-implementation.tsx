'use client';

import { useEffect, useRef } from 'react';
import type {
  OneDrivePickedItem,
  OneDrivePickerHostProps,
} from './onedrive-picker-host';

type PickerCommandMessage = {
  data?: {
    command?: string;
    items?: unknown[];
    resource?: string;
  };
  id?: string;
  type?: string;
};

function getPickerUrl(baseUrl: string, options: unknown) {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
  const base = new URL(normalizedBaseUrl);
  const url =
    base.origin === 'https://onedrive.live.com' && base.pathname === '/picker'
      ? base
      : new URL(`${normalizedBaseUrl}/_layouts/15/FilePicker.aspx`);
  url.searchParams.set('filePicker', JSON.stringify(options));
  url.searchParams.set('locale', navigator.language || 'en-us');
  return url.toString();
}

function extractPickedItems(command: PickerCommandMessage['data']) {
  const items = Array.isArray(command?.items) ? command.items : [];
  return items.flatMap((item): OneDrivePickedItem[] => {
    if (!item || typeof item !== 'object') return [];
    const record = item as {
      id?: unknown;
      parentReference?: { driveId?: unknown };
    };
    const itemId = typeof record.id === 'string' ? record.id : null;
    const driveId =
      typeof record.parentReference?.driveId === 'string'
        ? record.parentReference.driveId
        : null;
    return itemId && driveId ? [{ driveId, itemId }] : [];
  });
}

export function OneDrivePickerHostImplementation({
  accessToken,
  baseUrl,
  mode,
  onAuthenticate,
  onCanceled,
  onError,
  onPicked,
}: OneDrivePickerHostProps) {
  const openedRef = useRef(false);

  useEffect(() => {
    if (openedRef.current) return;
    openedRef.current = true;

    let pickerOrigin: string;
    try {
      pickerOrigin = new URL(baseUrl).origin;
    } catch {
      onError();
      return;
    }

    const channelId = crypto.randomUUID();
    const pickerWindow = window.open(
      '',
      'OneDrivePicker',
      'width=1080,height=680'
    );
    if (!pickerWindow) {
      onError();
      return;
    }

    let port: MessagePort | null = null;
    const options = {
      sdk: '8.0',
      authentication: {},
      commands: {
        pick: {
          action: 'select',
          select: {},
        },
      },
      entry: {
        oneDrive: {},
      },
      messaging: {
        channelId,
        origin: window.location.origin,
      },
      search: {
        enabled: true,
      },
      selection: {
        mode: 'single',
      },
      typesAndSources: {
        filters: mode === 'folder' ? ['folder'] : ['file'],
        mode: mode === 'folder' ? 'folders' : 'files',
      },
    };

    const form = pickerWindow.document.createElement('form');
    form.setAttribute('action', getPickerUrl(baseUrl, options));
    form.setAttribute('method', 'POST');
    const tokenInput = pickerWindow.document.createElement('input');
    tokenInput.setAttribute('type', 'hidden');
    tokenInput.setAttribute('name', 'access_token');
    tokenInput.setAttribute('value', accessToken);
    form.append(tokenInput);
    pickerWindow.document.body.append(form);
    form.submit();

    const closePicker = () => {
      port?.close();
      pickerWindow.close();
    };

    const handleCommand = async (event: MessageEvent<PickerCommandMessage>) => {
      const payload = event.data;
      if (payload.type !== 'command' || !payload.id || !port) return;
      const command = payload.data;
      port.postMessage({ id: payload.id, type: 'acknowledge' });

      if (command?.command === 'authenticate') {
        try {
          const token = await onAuthenticate({
            command: command.command,
            resource: command.resource,
          });
          port.postMessage({
            data: { result: 'token', token },
            id: payload.id,
            type: 'result',
          });
        } catch (error) {
          port.postMessage({
            data: {
              error: {
                code: 'unableToObtainToken',
                message:
                  error instanceof Error
                    ? error.message
                    : 'Could not prepare OneDrive Picker.',
              },
              result: 'error',
            },
            id: payload.id,
            type: 'result',
          });
          if (
            !error ||
            typeof error !== 'object' ||
            !('code' in error) ||
            error.code !== 'ONEDRIVE_PICKER_AUTHORIZATION_REQUIRED'
          ) {
            onError();
          }
        }
        return;
      }

      if (command?.command === 'pick') {
        onPicked(extractPickedItems(command));
        port.postMessage({
          data: { result: 'success' },
          id: payload.id,
          type: 'result',
        });
        closePicker();
        return;
      }

      if (command?.command === 'close') {
        port.postMessage({
          data: { result: 'success' },
          id: payload.id,
          type: 'result',
        });
        onCanceled();
        closePicker();
        return;
      }

      port.postMessage({
        data: {
          error: {
            code: 'unsupportedCommand',
            message: command?.command || 'Unsupported command',
          },
          result: 'error',
        },
        id: payload.id,
        type: 'result',
      });
    };

    const handleInitialize = (event: MessageEvent<PickerCommandMessage>) => {
      if (event.source !== pickerWindow) return;
      if (event.origin !== pickerOrigin) return;
      const message = event.data;
      if (message.type !== 'initialize' || message.id !== undefined) return;
      if ((message as { channelId?: string }).channelId !== channelId) return;
      port = event.ports[0];
      port.addEventListener('message', handleCommand);
      port.start();
      port.postMessage({ type: 'activate' });
    };

    window.addEventListener('message', handleInitialize);
    const closeWatcher = window.setInterval(() => {
      if (pickerWindow.closed) {
        onCanceled();
        window.clearInterval(closeWatcher);
      }
    }, 500);

    return () => {
      window.clearInterval(closeWatcher);
      window.removeEventListener('message', handleInitialize);
      port?.removeEventListener('message', handleCommand);
      port?.close();
    };
  }, [
    accessToken,
    baseUrl,
    mode,
    onAuthenticate,
    onCanceled,
    onError,
    onPicked,
  ]);

  return null;
}
