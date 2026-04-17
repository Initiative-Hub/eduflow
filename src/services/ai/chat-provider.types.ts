import type { ProviderOptions } from '@ai-sdk/provider-utils';
import type { UIMessage } from 'ai';

export type ChatProvider = 'ai-gateway' | 'google' | 'openrouter';
export type StreamChatInput = {
  messages: UIMessage[];
  provider?: ChatProvider;
  model?: string;
  apiKey?: string;
  providerOptions?: ProviderOptions;
};
