import type { ProviderOptions } from '@ai-sdk/provider-utils';
import type { StreamObjectOnFinishCallback, UIMessage } from 'ai';

import type { AICourseGeneration } from '@/lib/validations/course.schema';

export type ChatProvider = 'ai-gateway' | 'google' | 'openrouter';
export type StreamChatInput = {
  messages: UIMessage[];
  provider?: ChatProvider;
  model?: string;
  apiKey?: string;
  providerOptions?: ProviderOptions;
  system?: string;
};

export type StreamCourseInput = {
  userId: string;
  fileId?: string;
  file?: File;
  model?: string;
  apiKey?: string;
  providerOptions?: any;
  onFinish?: StreamObjectOnFinishCallback<AICourseGeneration>;
};
