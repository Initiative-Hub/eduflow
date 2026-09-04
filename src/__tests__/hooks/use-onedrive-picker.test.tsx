import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildOneDrivePickerAuthorizationUrl,
  useOneDrivePicker,
} from '@/hooks/use-onedrive-picker';
import { apiClient } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  apiClient: { post: vi.fn() },
}));

const apiClientMock = apiClient as unknown as {
  post: ReturnType<typeof vi.fn>;
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('useOneDrivePicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prepares host props with the connected server token', async () => {
    apiClientMock.post.mockResolvedValue({
      data: {
        accessToken: 'server-connected-token',
        accountEmail: 'drive-account@example.com',
        baseUrl: 'https://onedrive.live.com/picker',
        expiresAt: null,
      },
    });
    const onPicked = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(
      () => useOneDrivePicker({ onError, onPicked }),
      { wrapper: createWrapper() }
    );

    act(() => result.current.openPicker());

    await waitFor(() => expect(result.current.pickerProps).not.toBeNull());
    expect(apiClientMock.post).toHaveBeenCalledWith(
      'v1/integrations/onedrive/picker-token',
      {}
    );
    expect(result.current.pickerProps).toMatchObject({
      accessToken: 'server-connected-token',
      baseUrl: 'https://onedrive.live.com/picker',
      mode: 'files',
    });
    expect(onError).not.toHaveBeenCalled();

    act(() =>
      result.current.pickerProps?.onPicked([
        { driveId: 'drive-1', itemId: 'file-1' },
      ])
    );
    expect(onPicked).toHaveBeenCalledWith([
      { driveId: 'drive-1', itemId: 'file-1' },
    ]);
    expect(result.current.pickerProps).toBeNull();
  });

  it('opens explicit authorization without surfacing a generic error', async () => {
    apiClientMock.post.mockRejectedValue({
      code: 'ONEDRIVE_PICKER_AUTHORIZATION_REQUIRED',
      message:
        'Microsoft requires additional permission to browse OneDrive folders.',
      status: 409,
    });
    const onError = vi.fn();
    const { result } = renderHook(
      () =>
        useOneDrivePicker({
          messages: {
            connectRequired: 'connect required',
            sessionChanged: 'session changed',
            tokenFailed: 'token failed',
            unavailable: 'unavailable',
          },
          onError,
          onPicked: vi.fn(),
        }),
      { wrapper: createWrapper() }
    );

    act(() => result.current.openPicker());

    await waitFor(() =>
      expect(result.current.authorizationRequired).toBe(true)
    );
    expect(onError).not.toHaveBeenCalled();
    expect(result.current.pickerProps).toBeNull();

    act(() => result.current.dismissAuthorization());
    expect(result.current.authorizationRequired).toBe(false);
  });

  it('does not show the authorization dialog for provider failures', async () => {
    apiClientMock.post.mockRejectedValue({
      code: 'ONEDRIVE_PROVIDER_ERROR',
      message: 'Microsoft provider unavailable.',
      status: 500,
    });
    const onError = vi.fn();
    const { result } = renderHook(
      () => useOneDrivePicker({ onError, onPicked: vi.fn() }),
      { wrapper: createWrapper() }
    );

    act(() => result.current.openPicker());

    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(result.current.authorizationRequired).toBe(false);
  });

  it('builds a Picker authorization URL for the current localized route', () => {
    expect(
      buildOneDrivePickerAuthorizationUrl({
        pathname: '/vi/settings/integrations',
        search: '?tab=cloud&oneDrive=picker-error',
      })
    ).toBe(
      '/api/v1/integrations/onedrive/picker-authorize?returnTo=%2Fvi%2Fsettings%2Fintegrations%3Ftab%3Dcloud'
    );
  });
});
