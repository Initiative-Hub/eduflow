import type { streamText } from 'ai';

import type {
  StreamChatInput,
  StreamChatInternalOptions,
} from './chat-provider.types';

export interface ChatProviderService {
  streamChat: (
    input: StreamChatInput,
    options?: StreamChatInternalOptions
  ) => Promise<ReturnType<typeof streamText>>;
}
