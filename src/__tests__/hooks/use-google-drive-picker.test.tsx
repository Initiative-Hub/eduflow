import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGoogleDrivePicker } from '@/hooks/use-google-drive-picker';
import { apiClient } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  apiClient: {
    get: vi.fn(),
  },
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
  let pickerBuilder: {
    addView: ReturnType<typeof vi.fn>;
    build: ReturnType<typeof vi.fn>;
    setAppId: ReturnType<typeof vi.fn>;
    setCallback: ReturnType<typeof vi.fn>;
    setDeveloperKey: ReturnType<typeof vi.fn>;
    setOAuthToken: ReturnType<typeof vi.fn>;
    setOrigin: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    document.head.innerHTML = '';
    process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID = 'google-client-id';
    process.env.NEXT_PUBLIC_GOOGLE_PICKER_API_KEY = 'picker-api-key';
    process.env.NEXT_PUBLIC_GOOGLE_DRIVE_APP_ID = 'drive-app-id';

    const pickerInstance = {
      setVisible: vi.fn(),
    };
    pickerBuilder = {
      addView: vi.fn().mockReturnThis(),
      build: vi.fn(() => pickerInstance),
      setAppId: vi.fn().mockReturnThis(),
      setCallback: vi.fn().mockReturnThis(),
      setDeveloperKey: vi.fn().mockReturnThis(),
      setOAuthToken: vi.fn().mockReturnThis(),
      setOrigin: vi.fn().mockReturnThis(),
    };
    const PickerBuilder = vi.fn(function PickerBuilder() {
      return pickerBuilder;
    });
    const DocsView = vi.fn(function DocsView() {
      return {
        setMode: vi.fn().mockReturnThis(),
      };
    });

    Object.defineProperty(window, 'gapi', {
      configurable: true,
      value: {
        load: vi.fn((_name: string, callback: () => void) => callback()),
      },
    });
    Object.defineProperty(window, 'google', {
      configurable: true,
      value: {
        picker: {
          Action: { CANCEL: 'cancel', PICKED: 'picked' },
          DocsView,
          DocsViewMode: { LIST: 'list' },
          Document: { ID: 'id' },
          PickerBuilder,
          Response: { ACTION: 'action', DOCUMENTS: 'docs' },
          ViewId: { DOCS: 'docs' },
        },
      },
    });

    vi.spyOn(document.head, 'appendChild').mockImplementation((node: Node) => {
      const script = node as HTMLScriptElement;
      queueMicrotask(() => script.onload?.(new Event('load')));
      return node;
    });
  });

  it('opens Picker with the server token for the connected Drive account', async () => {
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

    await waitFor(() => expect(result.current.isReady).toBe(true));

    await act(async () => {
      result.current.openPicker();
    });

    await waitFor(() =>
      expect(pickerBuilder.setOAuthToken).toHaveBeenCalledWith(
        'server-connected-token'
      )
    );
    expect(apiClientMock.get).toHaveBeenCalledWith(
      'v1/integrations/google-drive/picker-token'
    );
    expect(pickerBuilder.setOrigin).toHaveBeenCalledWith(
      window.location.origin
    );
    expect((window.google as any)?.accounts?.oauth2).toBeUndefined();
    expect(onError).not.toHaveBeenCalled();
  });

  it('runs pre-open cleanup before requesting the server token', async () => {
    apiClientMock.get.mockResolvedValue({
      data: {
        accessToken: 'server-connected-token',
        accountEmail: 'drive-account@example.com',
        expiresAt: '2026-07-17T01:00:00.000Z',
      },
    });
    const onBeforeOpen = vi.fn();

    const { result } = renderHook(
      () => useGoogleDrivePicker({ onBeforeOpen, onPicked: vi.fn() }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isReady).toBe(true));

    await act(async () => {
      result.current.openPicker();
    });

    expect(onBeforeOpen.mock.invocationCallOrder[0]).toBeLessThan(
      apiClientMock.get.mock.invocationCallOrder[0]
    );
  });
});
