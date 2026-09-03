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
    expect(JSON.parse(filePicker ?? '{}')).toMatchObject({
      sdk: '8.0',
      typesAndSources: {
        filters: ['folder'],
        mode: 'folders',
      },
    });
  });
});
