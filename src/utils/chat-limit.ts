export type ChatMessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessageLike {
  role: ChatMessageRole;
}

export const getUserMessageCount = (messages: readonly ChatMessageLike[]) =>
  messages.filter((message) => message.role === 'user').length;

export const hasReachedUserMessageLimit = (
  messages: readonly ChatMessageLike[],
  limit: number
) => getUserMessageCount(messages) >= limit;
