import { act, render, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OneDrivePickerHostImplementation } from '@/components/onedrive-picker/onedrive-picker-host-implementation';

type PickerWindow = Window & {
  close: ReturnType<typeof vi.fn>;
  closed: boolean;
  submittedForm?: HTMLFormElement;
};

function createPickerWindow(onSubmit?: (pickerWindow: PickerWindow) => void) {
  const pickerDocument = document.implementation.createHTMLDocument('Picker');
  const pickerWindow = {
    close: vi.fn(),
    closed: false,
    document: pickerDocument,
  } as PickerWindow;

  pickerDocument.createElement = new Proxy(pickerDocument.createElement, {
    apply(target, thisArg, argArray: [string]) {
      const element = Reflect.apply(target, thisArg, argArray) as HTMLElement;
      if (argArray[0] === 'form') {
        vi.spyOn(element as HTMLFormElement, 'submit').mockImplementation(
          () => {
            pickerWindow.submittedForm = element as HTMLFormElement;
            onSubmit?.(pickerWindow);
          }
        );
      }
      return element;
    },
  });

  return pickerWindow;
}

function createPickerPort() {
  let messageHandler:
    | ((event: MessageEvent) => Promise<void> | void)
    | undefined;
  const port = {
    addEventListener: vi.fn(
      (
        _type: string,
        handler: (event: MessageEvent) => Promise<void> | void
      ) => {
        messageHandler = handler;
      }
    ),
    close: vi.fn(),
    postMessage: vi.fn(),
    removeEventListener: vi.fn(),
    start: vi.fn(),
  } as unknown as MessagePort;

  return {
    dispatch: async (data: unknown) => {
      await messageHandler?.(new MessageEvent('message', { data }));
    },
    port,
  };
}

describe('OneDrivePickerHostImplementation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('crypto', { randomUUID: () => 'channel-1' });
  });

  it('opens folder picker mode with a resource-specific token', async () => {
    const pickerWindow = createPickerWindow();
    vi.spyOn(window, 'open').mockReturnValue(pickerWindow);

    render(
      <OneDrivePickerHostImplementation
        accessToken="sharepoint-token"
        baseUrl="https://tenant-my.sharepoint.com"
        mode="folder"
        onAuthenticate={vi.fn()}
        onCanceled={vi.fn()}
        onError={vi.fn()}
        onPicked={vi.fn()}
      />
    );

    await waitFor(() => expect(pickerWindow.submittedForm).toBeDefined());

    const form = pickerWindow.submittedForm;
    expect(form?.method).toBe('post');
    expect(form?.action).toContain(
      'https://tenant-my.sharepoint.com/_layouts/15/FilePicker.aspx'
    );
    expect(
      form?.querySelector<HTMLInputElement>('input[name="access_token"]')?.value
    ).toBe('sharepoint-token');

    const filePicker = new URL(form?.action ?? '').searchParams.get(
      'filePicker'
    );
    expect(filePicker).toBeTruthy();
    const pickerOptions = JSON.parse(filePicker ?? '{}');
    expect(pickerOptions).toMatchObject({
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
      sdk: '8.0',
      selection: {
        mode: 'single',
      },
      typesAndSources: {
        filters: ['folder'],
        mode: 'folders',
      },
    });
    expect(pickerOptions.commands.pick.select).not.toHaveProperty('mode');
  });

  it('posts personal Picker requests directly to the consumer endpoint', async () => {
    const pickerWindow = createPickerWindow();
    vi.spyOn(window, 'open').mockReturnValue(pickerWindow);

    render(
      <OneDrivePickerHostImplementation
        accessToken="personal-picker-token"
        baseUrl="https://onedrive.live.com/picker"
        mode="folder"
        onAuthenticate={vi.fn()}
        onCanceled={vi.fn()}
        onError={vi.fn()}
        onPicked={vi.fn()}
      />
    );

    await waitFor(() => expect(pickerWindow.submittedForm).toBeDefined());

    const action = new URL(pickerWindow.submittedForm?.action ?? '');
    expect(action.origin).toBe('https://onedrive.live.com');
    expect(action.pathname).toBe('/picker');
    expect(action.searchParams.get('filePicker')).toBeTruthy();
    expect(
      JSON.parse(action.searchParams.get('filePicker') ?? '{}')
    ).toMatchObject({
      authentication: {
        tokens: {
          graph: false,
          sharePoint: true,
          substrate: false,
        },
      },
    });
  });

  it('uses a unique window name instead of reusing a cross-origin Picker', async () => {
    const stalePickerWindow = {
      close: vi.fn(),
      closed: false,
    } as unknown as PickerWindow;
    Object.defineProperty(stalePickerWindow, 'document', {
      get: () => {
        throw new DOMException(
          'Blocked a cross-origin frame.',
          'SecurityError'
        );
      },
    });
    const pickerWindow = createPickerWindow();
    const openPicker = vi
      .spyOn(window, 'open')
      .mockImplementation((_url, target) =>
        target === 'OneDrivePicker' ? stalePickerWindow : pickerWindow
      );
    const onError = vi.fn();

    render(
      <OneDrivePickerHostImplementation
        accessToken="personal-picker-token"
        baseUrl="https://onedrive.live.com/picker"
        mode="files"
        onAuthenticate={vi.fn()}
        onCanceled={vi.fn()}
        onError={onError}
        onPicked={vi.fn()}
      />
    );

    await waitFor(() => expect(pickerWindow.submittedForm).toBeDefined());
    expect(openPicker).toHaveBeenCalledWith(
      '',
      'OneDrivePicker-channel-1',
      'width=1080,height=680'
    );
    expect(stalePickerWindow.close).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('accepts initialization only from the normalized Picker origin', async () => {
    const pickerWindow = createPickerWindow();
    vi.spyOn(window, 'open').mockReturnValue(pickerWindow);
    const port = {
      addEventListener: vi.fn(),
      close: vi.fn(),
      postMessage: vi.fn(),
      removeEventListener: vi.fn(),
      start: vi.fn(),
    } as unknown as MessagePort;

    render(
      <OneDrivePickerHostImplementation
        accessToken="sharepoint-token"
        baseUrl="https://tenant-my.sharepoint.com/personal/user"
        mode="folder"
        onAuthenticate={vi.fn()}
        onCanceled={vi.fn()}
        onError={vi.fn()}
        onPicked={vi.fn()}
      />
    );
    await waitFor(() => expect(pickerWindow.submittedForm).toBeDefined());

    const data = { channelId: 'channel-1', type: 'initialize' };
    window.dispatchEvent(
      new MessageEvent('message', {
        data,
        origin: 'https://other-tenant.sharepoint.com',
        ports: [port],
        source: pickerWindow,
      })
    );
    expect(port.start).not.toHaveBeenCalled();

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { ...data, channelId: 'other-channel' },
        origin: 'https://tenant-my.sharepoint.com',
        ports: [port],
        source: pickerWindow,
      })
    );
    expect(port.start).not.toHaveBeenCalled();

    window.dispatchEvent(
      new MessageEvent('message', {
        data,
        origin: 'https://tenant-my.sharepoint.com',
        ports: [port],
        source: pickerWindow,
      })
    );
    expect(port.start).toHaveBeenCalledOnce();
    expect(port.postMessage).toHaveBeenCalledWith({ type: 'activate' });
  });

  it('listens for Picker initialization before submitting the form', async () => {
    const port = {
      addEventListener: vi.fn(),
      close: vi.fn(),
      postMessage: vi.fn(),
      removeEventListener: vi.fn(),
      start: vi.fn(),
    } as unknown as MessagePort;
    const pickerWindow = createPickerWindow((source) => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { channelId: 'channel-1', type: 'initialize' },
          origin: 'https://onedrive.live.com',
          ports: [port],
          source,
        })
      );
    });
    vi.spyOn(window, 'open').mockReturnValue(pickerWindow);

    render(
      <OneDrivePickerHostImplementation
        accessToken="personal-picker-token"
        baseUrl="https://onedrive.live.com/picker"
        mode="folder"
        onAuthenticate={vi.fn()}
        onCanceled={vi.fn()}
        onError={vi.fn()}
        onPicked={vi.fn()}
      />
    );

    await waitFor(() => expect(pickerWindow.submittedForm).toBeDefined());
    expect(port.start).toHaveBeenCalledOnce();
    expect(port.postMessage).toHaveBeenCalledWith({ type: 'activate' });
  });

  it('keeps the Picker messaging session active through Strict Mode replay', async () => {
    const pickerWindow = createPickerWindow();
    vi.spyOn(window, 'open').mockReturnValue(pickerWindow);
    const port = {
      addEventListener: vi.fn(),
      close: vi.fn(),
      postMessage: vi.fn(),
      removeEventListener: vi.fn(),
      start: vi.fn(),
    } as unknown as MessagePort;

    render(
      <StrictMode>
        <OneDrivePickerHostImplementation
          accessToken="personal-picker-token"
          baseUrl="https://onedrive.live.com/picker"
          mode="folder"
          onAuthenticate={vi.fn()}
          onCanceled={vi.fn()}
          onError={vi.fn()}
          onPicked={vi.fn()}
        />
      </StrictMode>
    );
    await waitFor(() => expect(pickerWindow.submittedForm).toBeDefined());

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { channelId: 'channel-1', type: 'initialize' },
        origin: 'https://onedrive.live.com',
        ports: [port],
        source: pickerWindow,
      })
    );

    expect(port.start).toHaveBeenCalledOnce();
    expect(port.postMessage).toHaveBeenCalledWith({ type: 'activate' });
    expect(window.open).toHaveBeenCalledOnce();
  });

  it('closes the popup and port when the host unmounts', async () => {
    const pickerWindow = createPickerWindow();
    vi.spyOn(window, 'open').mockReturnValue(pickerWindow);
    const { port } = createPickerPort();
    const { unmount } = render(
      <OneDrivePickerHostImplementation
        accessToken="personal-picker-token"
        baseUrl="https://onedrive.live.com/picker"
        mode="files"
        onAuthenticate={vi.fn()}
        onCanceled={vi.fn()}
        onError={vi.fn()}
        onPicked={vi.fn()}
      />
    );
    await waitFor(() => expect(pickerWindow.submittedForm).toBeDefined());

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { channelId: 'channel-1', type: 'initialize' },
        origin: 'https://onedrive.live.com',
        ports: [port],
        source: pickerWindow,
      })
    );
    unmount();

    expect(port.removeEventListener).toHaveBeenCalledWith(
      'message',
      expect.any(Function)
    );
    expect(port.close).toHaveBeenCalledOnce();
    expect(pickerWindow.close).toHaveBeenCalledOnce();
  });

  it('reports a manually closed popup as cancellation only once', async () => {
    vi.useFakeTimers();
    try {
      const pickerWindow = createPickerWindow();
      vi.spyOn(window, 'open').mockReturnValue(pickerWindow);
      const onCanceled = vi.fn();

      render(
        <OneDrivePickerHostImplementation
          accessToken="personal-picker-token"
          baseUrl="https://onedrive.live.com/picker"
          mode="files"
          onAuthenticate={vi.fn()}
          onCanceled={onCanceled}
          onError={vi.fn()}
          onPicked={vi.fn()}
        />
      );
      await act(() => vi.advanceTimersByTimeAsync(0));
      expect(pickerWindow.submittedForm).toBeDefined();

      pickerWindow.closed = true;
      await act(() => vi.advanceTimersByTimeAsync(500));
      await act(() => vi.advanceTimersByTimeAsync(500));

      expect(onCanceled).toHaveBeenCalledOnce();
      expect(pickerWindow.close).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it('reports a missing initialization port once and closes the popup', async () => {
    const pickerWindow = createPickerWindow();
    vi.spyOn(window, 'open').mockReturnValue(pickerWindow);
    const onError = vi.fn();

    render(
      <OneDrivePickerHostImplementation
        accessToken="personal-picker-token"
        baseUrl="https://onedrive.live.com/picker"
        mode="files"
        onAuthenticate={vi.fn()}
        onCanceled={vi.fn()}
        onError={onError}
        onPicked={vi.fn()}
      />
    );
    await waitFor(() => expect(pickerWindow.submittedForm).toBeDefined());

    const initialize = new MessageEvent('message', {
      data: { channelId: 'channel-1', type: 'initialize' },
      origin: 'https://onedrive.live.com',
      source: pickerWindow,
    });
    window.dispatchEvent(initialize);
    window.dispatchEvent(initialize);

    expect(onError).toHaveBeenCalledOnce();
    expect(pickerWindow.close).toHaveBeenCalledOnce();
  });

  it('acknowledges a pick before settling without reporting cancellation', async () => {
    const pickerWindow = createPickerWindow();
    vi.spyOn(window, 'open').mockReturnValue(pickerWindow);
    const { dispatch, port } = createPickerPort();
    const onCanceled = vi.fn();
    const onPicked = vi.fn();

    render(
      <OneDrivePickerHostImplementation
        accessToken="personal-picker-token"
        baseUrl="https://onedrive.live.com/picker"
        mode="files"
        onAuthenticate={vi.fn()}
        onCanceled={onCanceled}
        onError={vi.fn()}
        onPicked={onPicked}
      />
    );
    await waitFor(() => expect(pickerWindow.submittedForm).toBeDefined());
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { channelId: 'channel-1', type: 'initialize' },
        origin: 'https://onedrive.live.com',
        ports: [port],
        source: pickerWindow,
      })
    );

    await act(() =>
      dispatch({
        data: {
          command: 'pick',
          items: [{ id: 'item-1', parentReference: { driveId: 'drive-1' } }],
        },
        id: 'command-1',
        type: 'command',
      })
    );

    expect(port.postMessage).toHaveBeenNthCalledWith(2, {
      id: 'command-1',
      type: 'acknowledge',
    });
    expect(port.postMessage).toHaveBeenNthCalledWith(3, {
      data: { result: 'success' },
      id: 'command-1',
      type: 'result',
    });
    expect(onPicked).toHaveBeenCalledWith([
      { driveId: 'drive-1', itemId: 'item-1' },
    ]);
    expect(onCanceled).not.toHaveBeenCalled();
    expect(pickerWindow.close).toHaveBeenCalledOnce();
  });

  it('reports popup and popup-document failures once', async () => {
    const onPopupBlocked = vi.fn();
    vi.spyOn(window, 'open').mockReturnValueOnce(null);

    const blockedView = render(
      <StrictMode>
        <OneDrivePickerHostImplementation
          accessToken="personal-picker-token"
          baseUrl="https://onedrive.live.com/picker"
          mode="files"
          onAuthenticate={vi.fn()}
          onCanceled={vi.fn()}
          onError={onPopupBlocked}
          onPicked={vi.fn()}
        />
      </StrictMode>
    );
    await waitFor(() => expect(onPopupBlocked).toHaveBeenCalledOnce());
    expect(window.open).toHaveBeenCalledOnce();
    blockedView.unmount();

    const inaccessibleWindow = {
      close: vi.fn(),
      closed: false,
    } as unknown as PickerWindow;
    Object.defineProperty(inaccessibleWindow, 'document', {
      get: () => {
        throw new DOMException(
          'Blocked a cross-origin frame.',
          'SecurityError'
        );
      },
    });
    vi.mocked(window.open).mockReturnValueOnce(inaccessibleWindow);
    const onDocumentError = vi.fn();

    render(
      <OneDrivePickerHostImplementation
        accessToken="personal-picker-token"
        baseUrl="https://onedrive.live.com/picker"
        mode="files"
        onAuthenticate={vi.fn()}
        onCanceled={vi.fn()}
        onError={onDocumentError}
        onPicked={vi.fn()}
      />
    );

    await waitFor(() => expect(onDocumentError).toHaveBeenCalledOnce());
    expect(inaccessibleWindow.close).toHaveBeenCalledOnce();
  });
});
