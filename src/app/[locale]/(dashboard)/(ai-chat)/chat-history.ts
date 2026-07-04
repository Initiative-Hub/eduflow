import type { InfiniteData } from '@tanstack/react-query';
import type { UIMessage } from 'ai';

export function mergeChatMessages<TMessage extends UIMessage>(
  historyPages:
    | Array<{
        messages: TMessage[];
      }>
    | undefined,
  liveMessages: TMessage[]
) {
  const merged = new Map<string, TMessage>();
  const historyMessages =
    historyPages
      ?.toReversed()
      .flatMap((page) => page.messages)
      .filter((message) => message.id) ?? [];

  for (const message of historyMessages) {
    merged.set(message.id, message);
  }

  for (const message of liveMessages) {
    merged.set(message.id, message);
  }

  return Array.from(merged.values());
}

export function createInitialChatHistoryData<
  TPage extends { messages: UIMessage[] },
>(page: TPage): InfiniteData<TPage, string | undefined> {
  return {
    pages: [page],
    pageParams: [undefined],
  };
}
