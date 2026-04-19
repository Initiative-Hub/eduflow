import type { UIMessage } from '@ai-sdk/react';

export const getUserMessageCount = (messages: UIMessage[]) =>
  messages.filter((message) => message.role === 'user').length;

export const hasReachedUserMessageLimit = (
  messages: UIMessage[],
  limit: number
) => getUserMessageCount(messages) >= limit;
