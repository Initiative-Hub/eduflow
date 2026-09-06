import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGoogleDrivePicker } from '@/hooks/use-google-drive-picker';
import { apiClient } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  apiClient: { get: vi.fn() },
}));

const apiClientMock = apiClient as unknown as {
  get: ReturnType<typeof vi.fn>;
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

describe('useGoogleDrivePicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_GOOGLE_PICKER_API_KEY = 'picker-api-key';
    process.env.NEXT_PUBLIC_GOOGLE_DRIVE_APP_ID = 'drive-app-id';
  });

  it('prepares typed host props with the connected server token', async () => {
    apiClientMock.get.mockResolvedValue({
      data: {
        accessToken: 'server-connected-token',
        accountEmail: 'drive-account@example.com',
        expiresAt: '2026-07-17T01:00:00.000Z',
      },
    });
    const onPicked = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(
      () => useGoogleDrivePicker({ onError, onPicked }),
      { wrapper: createWrapper() }
    );

    act(() => result.current.openPicker());

    await waitFor(() => expect(result.current.pickerProps).not.toBeNull());
    expect(apiClientMock.get).toHaveBeenCalledWith(
      'v1/integrations/google-drive/picker-token'
    );
    expect(result.current.pickerProps).toMatchObject({
      accessToken: 'server-connected-token',
      apiKey: 'picker-api-key',
      appId: 'drive-app-id',
      mode: 'files',
    });
    expect(onError).not.toHaveBeenCalled();

    act(() => result.current.pickerProps?.onPicked(['file-1']));
    expect(onPicked).toHaveBeenCalledWith(['file-1']);
    expect(result.current.pickerProps).toBeNull();
  });

  it('runs pre-open cleanup before requesting the server token', async () => {
    apiClientMock.get.mockResolvedValue({
      data: { accessToken: 'server-connected-token' },
    });
    const onBeforeOpen = vi.fn();
    const { result } = renderHook(
      () => useGoogleDrivePicker({ onBeforeOpen, onPicked: vi.fn() }),
      { wrapper: createWrapper() }
    );

    act(() => result.current.openPicker());

    await waitFor(() => expect(apiClientMock.get).toHaveBeenCalledOnce());
    expect(onBeforeOpen.mock.invocationCallOrder[0]).toBeLessThan(
      apiClientMock.get.mock.invocationCallOrder[0]
    );
  });

  it('clears the active host when the user cancels', async () => {
    apiClientMock.get.mockResolvedValue({
      data: { accessToken: 'server-connected-token' },
    });
    const { result } = renderHook(
      () => useGoogleDrivePicker({ onPicked: vi.fn() }),
      { wrapper: createWrapper() }
    );

    act(() => result.current.openPicker());
    await waitFor(() => expect(result.current.pickerProps).not.toBeNull());
    act(() => result.current.pickerProps?.onCanceled());

    expect(result.current.pickerProps).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});
