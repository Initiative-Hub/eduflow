import type { streamText } from 'ai';

import type { StreamChatInput } from './chat-provider.types';

export interface ChatProviderService {
  streamChat: (
    input: StreamChatInput
  ) => Promise<ReturnType<typeof streamText>>;
}
