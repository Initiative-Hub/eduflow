import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useOneDriveExport } from '@/hooks/use-onedrive-export';
import { apiClient } from '@/lib/api';

vi.mock('@/lib/api', () => ({ apiClient: { post: vi.fn() } }));
vi.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations: () => (key: string) => key,
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useOneDriveExport', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retains the request ID after failure for equivalent sources and renews it after success', async () => {
    const post = vi.mocked(apiClient.post);
    post.mockRejectedValueOnce({ message: 'response lost' }).mockResolvedValue({
      data: { destination: { name: 'My files' }, webViewLink: null },
    });
    const source = {
      kind: 'lesson_presentation' as const,
      lessonId: '2b25a6da-09bc-4783-8a0d-60811389d612',
    };
    const { result } = renderHook(() => useOneDriveExport(), {
      wrapper: Wrapper,
    });
    await act(async () => {
      await result.current.mutateAsync(source).catch(() => undefined);
    });
    await act(async () => {
      await result.current.mutateAsync({ ...source });
    });
    const first = post.mock.calls[0]?.[1] as { requestId: string };
    const retry = post.mock.calls[1]?.[1] as { requestId: string };
    expect(retry.requestId).toBe(first.requestId);
    await act(async () => {
      await result.current.mutateAsync({ ...source });
    });
    const next = post.mock.calls[2]?.[1] as { requestId: string };
    expect(next.requestId).not.toBe(first.requestId);
  });
});
