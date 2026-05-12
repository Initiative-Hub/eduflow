import type { streamObject, streamText } from 'ai';

import type { StreamChatInput, StreamCourseInput } from './chat-provider.types';

export interface ChatProviderService {
  streamChat: (
    input: StreamChatInput
  ) => Promise<ReturnType<typeof streamText>>;

  streamCourse: (
    options: StreamCourseInput
  ) => Promise<ReturnType<typeof streamObject>>;
}
