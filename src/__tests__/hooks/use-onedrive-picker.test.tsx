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
  let pickerWindow: Window & { close: ReturnType<typeof vi.fn> };
  beforeEach(() => {
    vi.clearAllMocks();
    pickerWindow = {
      close: vi.fn(),
      closed: false,
    } as unknown as typeof pickerWindow;
    vi.spyOn(window, 'open').mockReturnValue(pickerWindow);
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
    expect(pickerWindow.close).toHaveBeenCalled();
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
    expect(pickerWindow.close).toHaveBeenCalled();

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

  it('lets the Picker host report one generic in-popup authentication failure', async () => {
    apiClientMock.post.mockResolvedValueOnce({
      data: {
        accessToken: 'server-connected-token',
        accountEmail: 'drive-account@example.com',
        baseUrl: 'https://onedrive.live.com/picker',
        expiresAt: null,
      },
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

    await waitFor(() => expect(result.current.pickerProps).not.toBeNull());
    const pickerProps = result.current.pickerProps;
    apiClientMock.post.mockRejectedValue({
      code: 'ONEDRIVE_INVALID_PICKER_RESOURCE',
      message: 'Invalid OneDrive picker resource.',
      status: 400,
    });

    await expect(
      pickerProps?.onAuthenticate({
        command: 'authenticate',
        resource: 'https://example.com',
      })
    ).rejects.toMatchObject({
      code: 'ONEDRIVE_INVALID_PICKER_RESOURCE',
    });
    await expect(
      pickerProps?.onAuthenticate({
        command: 'authenticate',
        resource: 'https://example.com',
      })
    ).rejects.toMatchObject({
      code: 'ONEDRIVE_INVALID_PICKER_RESOURCE',
    });
    expect(onError).not.toHaveBeenCalled();

    act(() => {
      pickerProps?.onError();
      pickerProps?.onError();
    });

    expect(onError).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith('unavailable');
  });

  it('reserves a unique popup synchronously while the token is pending', async () => {
    let resolveToken!: (value: unknown) => void;
    apiClientMock.post.mockReturnValue(
      new Promise((resolve) => {
        resolveToken = resolve;
      })
    );
    const { result } = renderHook(
      () => useOneDrivePicker({ onPicked: vi.fn() }),
      { wrapper: createWrapper() }
    );

    act(() => result.current.openPicker());
    expect(window.open).toHaveBeenCalledOnce();
    expect(window.open).toHaveBeenCalledWith(
      '',
      expect.stringMatching(/^OneDrivePicker-/),
      'width=1080,height=680'
    );
    expect(result.current.pickerProps).toBeNull();
    await act(async () =>
      resolveToken({
        data: {
          accessToken: 'token',
          baseUrl: 'https://onedrive.live.com/picker',
        },
      })
    );
    await waitFor(() =>
      expect(result.current.pickerProps?.pickerWindow).toBe(pickerWindow)
    );
    expect(window.open).toHaveBeenCalledOnce();
  });

  it('reports blocked popups before requesting a token', () => {
    vi.mocked(window.open).mockReturnValue(null);
    const onError = vi.fn();
    const { result } = renderHook(
      () => useOneDrivePicker({ onError, onPicked: vi.fn() }),
      { wrapper: createWrapper() }
    );
    act(() => result.current.openPicker());
    expect(onError).toHaveBeenCalledWith('OneDrive Picker is unavailable.');
    expect(apiClientMock.post).not.toHaveBeenCalled();
  });

  it('closes a pending popup on unmount and ignores the late token', async () => {
    let resolveToken!: (value: unknown) => void;
    apiClientMock.post.mockReturnValue(
      new Promise((resolve) => {
        resolveToken = resolve;
      })
    );
    const { result, unmount } = renderHook(
      () => useOneDrivePicker({ onPicked: vi.fn() }),
      { wrapper: createWrapper() }
    );
    act(() => result.current.openPicker());
    await waitFor(() => expect(apiClientMock.post).toHaveBeenCalled());
    unmount();
    expect(pickerWindow.close).toHaveBeenCalledOnce();
    await act(async () =>
      resolveToken({
        data: {
          accessToken: 'token',
          baseUrl: 'https://onedrive.live.com/picker',
        },
      })
    );
    expect(result.current.pickerProps).toBeNull();
  });

  it('does not mount the host if the reserved popup closes while loading', async () => {
    apiClientMock.post.mockImplementation(async () => {
      Object.defineProperty(pickerWindow, 'closed', { value: true });
      return {
        data: {
          accessToken: 'token',
          baseUrl: 'https://onedrive.live.com/picker',
        },
      };
    });
    const { result } = renderHook(
      () => useOneDrivePicker({ onPicked: vi.fn() }),
      { wrapper: createWrapper() }
    );
    act(() => result.current.openPicker());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.pickerProps).toBeNull();
  });

  it('ignores a stale authentication failure after opening another picker', async () => {
    const token = {
      data: {
        accessToken: 'token',
        baseUrl: 'https://onedrive.live.com/picker',
      },
    };
    apiClientMock.post.mockResolvedValue(token);
    const { result } = renderHook(
      () => useOneDrivePicker({ onPicked: vi.fn() }),
      { wrapper: createWrapper() }
    );
    act(() => result.current.openPicker());
    await waitFor(() => expect(result.current.pickerProps).not.toBeNull());
    const oldProps = result.current.pickerProps!;
    let rejectToken!: (reason: unknown) => void;
    apiClientMock.post.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectToken = reject;
        })
    );
    const pendingAuthentication = oldProps
      .onAuthenticate({ command: 'authenticate' })
      .catch(() => undefined);
    act(() => oldProps.onCanceled());
    const nextWindow = { close: vi.fn(), closed: false } as unknown as Window;
    vi.mocked(window.open).mockReturnValue(nextWindow);
    act(() => result.current.openPicker());
    await waitFor(() =>
      expect(result.current.pickerProps?.pickerWindow).toBe(nextWindow)
    );
    await act(async () => {
      rejectToken({ code: 'ONEDRIVE_PICKER_AUTHORIZATION_REQUIRED' });
      await pendingAuthentication;
    });
    expect(result.current.authorizationRequired).toBe(false);
    expect(result.current.pickerProps?.pickerWindow).toBe(nextWindow);
    expect(nextWindow.close).not.toHaveBeenCalled();
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
