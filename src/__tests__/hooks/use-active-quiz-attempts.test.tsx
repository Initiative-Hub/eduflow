import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useActiveQuizAttempts } from '@/hooks/use-active-quiz-attempts';

const mocks = vi.hoisted(() => ({
  session: {
    data: { user: { id: 'user-a' } } as { user: { id: string } } | null,
    isPending: false,
  },
  active: vi.fn(),
}));
vi.mock('@/lib/auth-client', () => ({ useSession: () => mocks.session }));
vi.mock('@/lib/api/api-client', () => ({
  apiClient: { get: mocks.active },
}));
function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    client,
    ...renderHook(() => useActiveQuizAttempts(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    }),
  };
}
describe('AI quiz input restriction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.session.data = { user: { id: 'user-a' } };
    mocks.session.isPending = false;
  });
  it('blocks while checking, keeps blocking until every attempt is ended, then unlocks', async () => {
    const attempts = [{ id: 'a' }, { id: 'b' }];
    mocks.active.mockResolvedValue(attempts);
    const { result } = setup();
    expect(result.current.blocked).toBe(true);
    await waitFor(() => expect(result.current.attempts).toHaveLength(2));
    mocks.active.mockResolvedValue([attempts[1]]);
    act(() => window.dispatchEvent(new Event('course-quiz-attempts')));
    await waitFor(() => expect(result.current.attempts).toHaveLength(1));
    expect(result.current.blocked).toBe(true);
    mocks.active.mockResolvedValue([]);
    act(() => window.dispatchEvent(new Event('course-quiz-attempts')));
    await waitFor(() => expect(result.current.blocked).toBe(false));
  });
  it('keeps input disabled after a failed status check', async () => {
    mocks.active.mockRejectedValue(new Error('Offline'));
    const { result } = setup();
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.blocked).toBe(true);
  });
  it('does not fetch or block guests and removes the previous account cache', async () => {
    mocks.active.mockResolvedValue([{ id: 'a' }]);
    const { result, rerender, client } = setup();
    await waitFor(() => expect(result.current.attempts).toHaveLength(1));
    mocks.session.data = null;
    rerender();
    await waitFor(() => expect(result.current.blocked).toBe(false));
    expect(result.current.attempts).toEqual([]);
    expect(
      client.getQueryData(['active-quiz-attempts', 'user-a'])
    ).toBeUndefined();
  });
});
