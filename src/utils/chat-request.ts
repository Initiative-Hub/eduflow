import type { UIMessage } from 'ai';

type PrepareLastMessageRequestInput<TMessage extends UIMessage> = {
  messages: TMessage[];
  body?: Record<string, unknown>;
};

export function prepareLastMessageRequest<TMessage extends UIMessage>({
  messages,
  body,
}: PrepareLastMessageRequestInput<TMessage>) {
  const message = messages.at(-1);

  if (!message) {
    throw new Error('Cannot send a chat request without messages.');
  }

  return {
    body: {
      ...body,
      message,
    },
  };
}
