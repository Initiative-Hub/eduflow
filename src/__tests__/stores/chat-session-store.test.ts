import { afterEach, describe, expect, it } from 'vitest';
import { useChatSessionStore } from '@/stores/useChatSessionStore';

describe('useChatSessionStore', () => {
  afterEach(() => {
    useChatSessionStore.setState({
      pendingMessage: null,
      optimisticChatId: null,
      optimisticMessages: [],
    });
  });

  it('stores and clears a pending message', () => {
    const { setPendingMessage, clearPendingMessage } =
      useChatSessionStore.getState();

    setPendingMessage('Hello');

    expect(useChatSessionStore.getState().pendingMessage).toBe('Hello');

    clearPendingMessage();

    expect(useChatSessionStore.getState().pendingMessage).toBeNull();
  });

  it('stores and clears optimistic messages', () => {
    const {
      setOptimisticChatId,
      setOptimisticMessages,
      clearOptimisticMessages,
    } = useChatSessionStore.getState();

    setOptimisticChatId('chat-1');
    setOptimisticMessages([
      {
        id: 'msg-1',
        role: 'user',
        parts: [{ type: 'text', text: 'Hello' }],
      },
    ]);

    expect(useChatSessionStore.getState().optimisticMessages).toHaveLength(1);
    expect(useChatSessionStore.getState().optimisticChatId).toBe('chat-1');

    clearOptimisticMessages();

    expect(useChatSessionStore.getState().optimisticMessages).toHaveLength(0);
    expect(useChatSessionStore.getState().optimisticChatId).toBeNull();
  });
});
