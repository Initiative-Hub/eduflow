import { describe, expect, it } from 'vitest';
import {
  getUserMessageCount,
  hasReachedUserMessageLimit,
} from '@/utils/chat-limit';

describe('chat-limit utilities', () => {
  it('counts only user messages', () => {
    const messages = [
      { role: 'user' },
      { role: 'assistant' },
      { role: 'user' },
      { role: 'system' },
    ] as const;

    expect(getUserMessageCount(messages)).toBe(2);
  });

  it('returns true when the user message limit is reached', () => {
    const messages = [
      { role: 'user' },
      { role: 'user' },
      { role: 'assistant' },
    ] as const;

    expect(hasReachedUserMessageLimit(messages, 2)).toBe(true);
  });

  it('returns false when under the limit', () => {
    const messages = [{ role: 'user' }, { role: 'assistant' }] as const;

    expect(hasReachedUserMessageLimit(messages, 3)).toBe(false);
  });
});
