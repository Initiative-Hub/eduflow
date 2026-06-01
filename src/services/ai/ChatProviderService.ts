import type { streamObject, streamText } from 'ai';

import type {
  StreamChatInput,
  StreamChatInternalOptions,
  StreamCourseInput,
} from './chat-provider.types';

export interface ChatProviderService {
  streamChat: (
    input: StreamChatInput,
    options?: StreamChatInternalOptions
  ) => Promise<ReturnType<typeof streamText>>;

  streamCourse: (
    options: StreamCourseInput
  ) => Promise<ReturnType<typeof streamObject>>;
}
