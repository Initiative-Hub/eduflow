import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OneDrivePickerHostImplementation } from '@/components/onedrive-picker/onedrive-picker-host-implementation';

type PickerWindow = Window & {
  close: ReturnType<typeof vi.fn>;
  closed: boolean;
  submittedForm?: HTMLFormElement;
};

function createPickerWindow() {
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
          }
        );
      }
      return element;
    },
  });

  return pickerWindow;
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
        data,
        origin: 'https://tenant-my.sharepoint.com',
        ports: [port],
        source: pickerWindow,
      })
    );
    expect(port.start).toHaveBeenCalledOnce();
    expect(port.postMessage).toHaveBeenCalledWith({ type: 'activate' });
  });
});
