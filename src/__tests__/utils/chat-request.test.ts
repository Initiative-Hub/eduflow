import type { UIMessage } from 'ai';
import { describe, expect, it } from 'vitest';
import { prepareLastMessageRequest } from '@/utils/chat-request';

const firstMessage: UIMessage = {
  id: 'msg-1',
  role: 'user',
  parts: [{ type: 'text', text: 'First question' }],
};

const secondMessage: UIMessage = {
  id: 'msg-2',
  role: 'assistant',
  parts: [{ type: 'text', text: 'First answer' }],
};

const latestMessage: UIMessage = {
  id: 'msg-3',
  role: 'user',
  parts: [{ type: 'text', text: 'Follow up' }],
};

describe('chat request helpers', () => {
  it('prepares a request body with only the latest message and preserves custom fields', () => {
    expect(
      prepareLastMessageRequest({
        messages: [firstMessage, secondMessage, latestMessage],
        body: {
          provider: 'openrouter',
          model: 'test-model',
          mode: 'review',
        },
      })
    ).toEqual({
      body: {
        provider: 'openrouter',
        model: 'test-model',
        mode: 'review',
        message: latestMessage,
      },
    });
  });
});
