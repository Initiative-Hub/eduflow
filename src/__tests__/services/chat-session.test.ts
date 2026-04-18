import { describe, expect, it } from 'vitest';
import { buildNewChatData } from '@/services/chat/chat-session';

describe('buildNewChatData', () => {
  it('creates a new chat payload with a trimmed title', () => {
    const result = buildNewChatData({
      guestId: 'guest-1',
      firstMessage: 'Hello world from the chat',
    });

    expect(result).toEqual({
      guestId: 'guest-1',
      title: 'Hello world from the chat',
      messages: [],
    });
  });

  it('falls back to a default title when message is empty', () => {
    const result = buildNewChatData({
      guestId: 'guest-2',
      firstMessage: '   ',
    });

    expect(result.title).toBe('New Chat');
  });
});
