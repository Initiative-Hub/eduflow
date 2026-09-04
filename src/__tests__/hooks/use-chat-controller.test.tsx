import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChatController } from '@/app/[locale]/(dashboard)/(ai)/(ai-chat)/use-chat';
import { chatService } from '@/app/[locale]/(dashboard)/(ai)/(ai-chat)/chat.service';
import { useChatSessionStore } from '@/stores/useChatSessionStore';

const mockPush = vi.fn();
vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/',
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/app/[locale]/(dashboard)/(ai)/(ai-chat)/chat.service', () => ({
  chatService: {
    createChat: vi.fn(),
    getChat: vi.fn(),
  },
}));

vi.mock('@/app/[locale]/(dashboard)/(ai)/chat-attachments.service', () => ({
  uploadChatAttachments: vi.fn().mockResolvedValue([]),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('useChatController optimistic UI updates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useChatSessionStore.setState({
      pendingMessage: null,
      pendingChatId: null,
      pendingModel: null,
    });
  });

  it('updates UI immediately with optimistic message and streaming indicator when starting a chat', async () => {
    let resolveCreateChat: (value: { chatId: string }) => void = () => {};
    const createChatPromise = new Promise<{ chatId: string }>((resolve) => {
      resolveCreateChat = resolve;
    });
    vi.mocked(chatService.createChat).mockReturnValue(createChatPromise);

    const { result } = renderHook(
      () =>
        useChatController({
          isAuthenticated: true,
        }),
      { wrapper: createWrapper() }
    );

    expect(result.current.messages).toEqual([]);
    expect(result.current.hasOutput).toBe(false);
    expect(result.current.isStreaming).toBe(false);

    // Call startChat
    act(() => {
      void result.current.startChat('Explain quantum computing');
    });

    // Verify UI updated FIRST: message is displayed, hasOutput is true, isStreaming is true
    expect(result.current.hasOutput).toBe(true);
    expect(result.current.isStreaming).toBe(true);
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]?.role).toBe('user');
    expect(result.current.messages[0]?.parts).toEqual([
      { type: 'text', text: 'Explain quantum computing' },
    ]);

    // Now resolve backend creation
    await act(async () => {
      resolveCreateChat({ chatId: 'chat-uuid-123' });
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/chat/chat-uuid-123');
    });
  });

  it('rolls back optimistic message if chat creation fails', async () => {
    vi.mocked(chatService.createChat).mockRejectedValue(
      new Error('Network error')
    );

    const { result } = renderHook(
      () =>
        useChatController({
          isAuthenticated: true,
        }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      try {
        await result.current.startChat('Failing message');
      } catch {
        // Expected
      }
    });

    // Should be rolled back
    expect(result.current.messages).toEqual([]);
    expect(result.current.hasOutput).toBe(false);
    expect(result.current.isStreaming).toBe(false);
  });
});
