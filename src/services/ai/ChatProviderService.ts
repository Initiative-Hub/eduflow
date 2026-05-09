import type { streamObject, streamText } from 'ai';
import type { StreamChatInput } from './chat-provider.types';

export interface ChatProviderService {
  streamChat: (
    input: StreamChatInput
  ) => Promise<ReturnType<typeof streamText>>;

  streamCourse: (options: {
    userId: string;
    fileId?: string;
    file?: File;
    model?: string;
    apiKey?: string;
    providerOptions?: any;
  }) => Promise<ReturnType<typeof streamObject>>;
}
