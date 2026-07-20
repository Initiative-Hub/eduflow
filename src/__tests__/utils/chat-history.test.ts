import type { UIMessage } from 'ai';
import { describe, expect, it } from 'vitest';
import type { ChatDetailsResponse } from '@/app/[locale]/(dashboard)/(ai)/(ai-chat)/chat.service';
import {
  createInitialChatHistoryData,
  mergeChatMessages,
} from '@/app/[locale]/(dashboard)/(ai)/(ai-chat)/chat-history';

function createMessage(
  id: string,
  role: UIMessage['role'],
  text: string
): UIMessage {
  return {
    id,
    role,
    parts: [{ type: 'text', text }],
  };
}

describe('chat history helpers', () => {
  it('merges older history pages before live chat messages without duplicates', () => {
    const latestPage: ChatDetailsResponse = {
      title: 'Chat',
      messageCount: 4,
      messages: [
        createMessage('msg-3', 'user', 'Third'),
        createMessage('msg-4', 'assistant', 'Fourth'),
      ],
      pagination: {
        hasMore: true,
        limit: 2,
        nextCursor: 'msg-3',
      },
    };
    const olderPage: ChatDetailsResponse = {
      title: 'Chat',
      messageCount: 4,
      messages: [
        createMessage('msg-1', 'user', 'First'),
        createMessage('msg-2', 'assistant', 'Second'),
      ],
      pagination: {
        hasMore: false,
        limit: 2,
        nextCursor: null,
      },
    };
    const liveMessages = [
      createMessage('msg-3', 'user', 'Third'),
      createMessage('msg-4', 'assistant', 'Fourth'),
      createMessage('msg-5', 'user', 'Fifth'),
    ];

    expect(mergeChatMessages([latestPage, olderPage], liveMessages)).toEqual([
      createMessage('msg-1', 'user', 'First'),
      createMessage('msg-2', 'assistant', 'Second'),
      createMessage('msg-3', 'user', 'Third'),
      createMessage('msg-4', 'assistant', 'Fourth'),
      createMessage('msg-5', 'user', 'Fifth'),
    ]);
  });

  it('creates infinite query initial data from the SSR page', () => {
    const page: ChatDetailsResponse = {
      title: 'Chat',
      messageCount: 2,
      messages: [
        createMessage('msg-1', 'user', 'First'),
        createMessage('msg-2', 'assistant', 'Second'),
      ],
      pagination: {
        hasMore: false,
        limit: 5,
        nextCursor: null,
      },
    };

    expect(createInitialChatHistoryData(page)).toEqual({
      pages: [page],
      pageParams: [undefined],
    });
  });
});
