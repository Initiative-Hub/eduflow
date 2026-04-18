import { describe, expect, it } from 'vitest';
import { getMessagePreview, getMessageText } from '@/utils/chat-message';

describe('chat message helpers', () => {
  it('extracts text from message parts', () => {
    const message = {
      parts: [
        { type: 'text', text: 'Hello' },
        { type: 'text', text: ' world' },
        { type: 'tool-call', toolCallId: '1' },
      ],
    };

    expect(getMessageText(message)).toBe('Hello world');
  });

  it('falls back to legacy content field when parts are missing', () => {
    const message = { content: 'Legacy content' };

    expect(getMessageText(message)).toBe('Legacy content');
  });

  it('creates a preview capped at a max length', () => {
    const message = {
      parts: [{ type: 'text', text: 'This is a long first message' }],
    };

    expect(getMessagePreview(message, 10)).toBe('This is a');
  });
});
