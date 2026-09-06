import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGoogleDriveExport } from '@/hooks/use-google-drive-export';
import { apiClient } from '@/lib/api';

vi.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations: () => (key: string) => key,
}));
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));
vi.mock('@/lib/api', () => ({
  apiClient: { post: vi.fn() },
}));

const apiClientMock = apiClient as unknown as {
  post: ReturnType<typeof vi.fn>;
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: 1, retryDelay: 0 } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('useGoogleDriveExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the same request UUID across a TanStack retry', async () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(
      '9ed2dd42-989f-42d2-99ec-c01269108257'
    );
    apiClientMock.post
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce({
        data: {
          destination: { kind: 'my_drive', name: 'My Drive' },
          fileId: 'drive-file-1',
          mimeType: 'application/octet-stream',
          name: 'notes.pdf',
          reused: true,
          size: 12,
          webViewLink: null,
        },
      });
    const { result } = renderHook(() => useGoogleDriveExport(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        fileId: '2b25a6da-09bc-4783-8a0d-60811389d612',
        kind: 'inventory_file',
      });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiClientMock.post).toHaveBeenCalledTimes(2);
    expect(apiClientMock.post.mock.calls[0]?.[1]).toEqual(
      apiClientMock.post.mock.calls[1]?.[1]
    );
    expect(apiClientMock.post).toHaveBeenLastCalledWith(
      'v1/integrations/google-drive/exports',
      expect.objectContaining({
        requestId: '9ed2dd42-989f-42d2-99ec-c01269108257',
      }),
      { timeout: 300_000 }
    );
  });
});
