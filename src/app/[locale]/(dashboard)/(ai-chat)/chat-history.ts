import type { InfiniteData } from '@tanstack/react-query';
import type { UIMessage } from 'ai';
import type { ChatDetailsResponse } from './chat.service';

function getMessageSignature(message: UIMessage) {
  return JSON.stringify({
    parts: message.parts,
    role: message.role,
  });
}

function findLiveHistoryOffset(
  historyMessages: UIMessage[],
  liveMessages: UIMessage[]
) {
  const firstLiveMessage = liveMessages[0];

  if (!firstLiveMessage) return -1;

  const firstLiveSignature = getMessageSignature(firstLiveMessage);

  return historyMessages.findIndex(
    (message) =>
      message.id === firstLiveMessage.id ||
      getMessageSignature(message) === firstLiveSignature
  );
}

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
  const liveHistoryOffset = findLiveHistoryOffset(
    historyMessages,
    liveMessages
  );

  for (const message of historyMessages) {
    merged.set(message.id, message);
  }

  for (const [index, message] of liveMessages.entries()) {
    const alignedHistoryMessage =
      liveHistoryOffset >= 0
        ? historyMessages[liveHistoryOffset + index]
        : undefined;

    if (
      alignedHistoryMessage &&
      alignedHistoryMessage.id !== message.id &&
      getMessageSignature(alignedHistoryMessage) ===
        getMessageSignature(message)
    ) {
      continue;
    }

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
