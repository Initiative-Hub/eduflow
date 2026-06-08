import type { ProviderOptions } from '@ai-sdk/provider-utils';
import type { UIMessage } from 'ai';

import type { AICourseGeneration } from '@/lib/validations/course.schema';

export type ChatProvider = 'ai-gateway' | 'google' | 'openrouter';
export type StreamChatPromptMode = 'append' | 'replace';

export type StreamChatInput = {
  messages: UIMessage[];
  provider?: ChatProvider;
  model?: string;
  apiKey?: string;
  providerOptions?: ProviderOptions;
};

export type StreamChatInternalOptions = {
  prompt?: string;
  mode?: StreamChatPromptMode;
};

export type StreamCourseInput = {
  userId: string;
  fileId?: string;
  file?: File;
  context?: string;
  model?: string;
  apiKey?: string;
  providerOptions?: ProviderOptions;
  onFinish?: (event: {
    object: AICourseGeneration;
  }) => PromiseLike<void> | void;
};

export type AIQuizInput = {
  quizType: string;
  questionNumbers: string;
  topic?: string;
  context?: string;
  content?: string;
  apiKey?: string;
  model?: string;
};
