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

function getPickerOptions(channelId: string, mode: 'files' | 'folder') {
  return {
    sdk: '8.0',
    authentication: {
      tokens: {
        graph: false,
        sharePoint: true,
        substrate: false,
      },
    },
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
    typesAndSources:
      mode === 'folder'
        ? { filters: ['folder'], mode: 'folders' }
        : { mode: 'files' },
  };
}

function submitPickerForm(
  pickerWindow: Window,
  baseUrl: string,
  accessToken: string,
  options: unknown
) {
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
}

function isPickerAuthorizationRequired(error: unknown) {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ONEDRIVE_PICKER_AUTHORIZATION_REQUIRED'
  );
}

export function startOneDrivePickerSession({
  accessToken,
  baseUrl,
  channelId,
  mode,
  pickerWindow,
  onAuthenticate: authenticate,
  onCanceled: canceled,
  onError: failed,
  onPicked: picked,
}: OneDrivePickerHostProps) {
  let pickerOrigin: string | null = null;
  try {
    pickerOrigin = new URL(baseUrl).origin;
  } catch {
    pickerOrigin = null;
  }

  let port: MessagePort | null = null;
  let closeWatcher: number | null = null;
  let launchTimer: number | null = null;
  let disposed = false;
  let settled = false;
  const options = getPickerOptions(channelId, mode);

  function clearCloseWatcher() {
    if (closeWatcher === null) return;
    window.clearInterval(closeWatcher);
    closeWatcher = null;
  }

  function closePicker() {
    clearCloseWatcher();
    window.removeEventListener('message', handleInitialize);
    port?.removeEventListener('message', handleCommand);
    port?.close();
    port = null;
  }

  function settle(callback: () => void) {
    if (disposed || settled) return;
    settled = true;
    try {
      callback();
    } finally {
      closePicker();
    }
  }

  async function handleCommand(event: MessageEvent<PickerCommandMessage>) {
    const payload = event.data;
    if (payload?.type !== 'command' || !payload.id || !port) return;
    const activePort = port;
    const command = payload.data;
    activePort.postMessage({ id: payload.id, type: 'acknowledge' });

    if (command?.command === 'authenticate') {
      try {
        const token = await authenticate({
          command: command.command,
          resource: command.resource,
        });
        if (disposed || settled || port !== activePort) return;
        activePort.postMessage({
          data: { result: 'token', token },
          id: payload.id,
          type: 'result',
        });
      } catch (error) {
        if (disposed || settled || port !== activePort) return;
        activePort.postMessage({
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
        if (!isPickerAuthorizationRequired(error)) {
          settle(failed);
        }
      }
      return;
    }

    if (command?.command === 'pick') {
      const items = extractPickedItems(command);
      activePort.postMessage({
        data: { result: 'success' },
        id: payload.id,
        type: 'result',
      });
      settle(() => picked(items));
      return;
    }

    if (command?.command === 'close') {
      activePort.postMessage({
        data: { result: 'success' },
        id: payload.id,
        type: 'result',
      });
      settle(canceled);
      return;
    }

    activePort.postMessage({
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
  }

  function handleInitialize(event: MessageEvent<PickerCommandMessage>) {
    if (disposed || settled || port || !pickerOrigin) return;
    if (event.source !== pickerWindow) return;
    if (event.origin !== pickerOrigin) return;
    const message = event.data;
    if (message?.type !== 'initialize') return;
    if ((message as { channelId?: string }).channelId !== channelId) return;
    const nextPort = event.ports[0];
    if (!nextPort) {
      settle(failed);
      return;
    }
    port = nextPort;
    port.addEventListener('message', handleCommand);
    port.start();
    port.postMessage({ type: 'activate' });
  }

  window.addEventListener('message', handleInitialize);

  launchTimer = window.setTimeout(() => {
    launchTimer = null;
    if (disposed || settled) return;
    if (!pickerOrigin) {
      settle(failed);
      return;
    }

    if (pickerWindow.closed) {
      settle(canceled);
      return;
    }

    try {
      submitPickerForm(pickerWindow, baseUrl, accessToken, options);
    } catch {
      settle(failed);
      return;
    }
    if (disposed || settled) return;

    closeWatcher = window.setInterval(() => {
      if (pickerWindow.closed) settle(canceled);
    }, 500);
  }, 0);

  return () => {
    disposed = true;
    if (launchTimer !== null) window.clearTimeout(launchTimer);
    closePicker();
  };
}
