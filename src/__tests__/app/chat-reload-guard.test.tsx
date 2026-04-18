import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatReloadGuard } from '@/app/[locale]/(dashboard)/chat/[chatId]/_components/chat-reload-guard';
import { useChatSessionStore } from '@/stores/useChatSessionStore';

const replaceMock = vi.fn();

vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

describe('ChatReloadGuard', () => {
  beforeEach(() => {
    replaceMock.mockClear();
    useChatSessionStore.setState({
      pendingMessage: null,
      pendingChatId: null,
      optimisticChatId: null,
      optimisticMessages: [],
    });
  });

  it('redirects to / when navigation is reload', async () => {
    const getEntriesSpy = vi
      .spyOn(performance, 'getEntriesByType')
      .mockReturnValue([{ type: 'reload' }] as unknown as PerformanceEntry[]);

    render(<ChatReloadGuard />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/');
    });

    getEntriesSpy.mockRestore();
  });

  it('does not redirect on standard navigation', async () => {
    const getEntriesSpy = vi
      .spyOn(performance, 'getEntriesByType')
      .mockReturnValue([{ type: 'navigate' }] as unknown as PerformanceEntry[]);

    render(<ChatReloadGuard />);

    await waitFor(() => {
      expect(replaceMock).not.toHaveBeenCalled();
    });

    getEntriesSpy.mockRestore();
  });
});
