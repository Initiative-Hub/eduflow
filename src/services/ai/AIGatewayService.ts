import {
  convertToModelMessages,
  createGateway,
  smoothStream,
  streamText,
} from 'ai';
import { DEFAULT_MODELS } from '@/services/ai/chat-provider.constants';
import type {
  StreamChatInput,
  StreamChatInternalOptions,
} from '@/services/ai/chat-provider.types';
import type { ChatProviderService } from './ChatProviderService';
import { resolveChatSystemPrompt } from './chat-system-prompt';

export class AIGatewayService implements ChatProviderService {
  async streamChat(
    input: StreamChatInput,
    options?: StreamChatInternalOptions
  ) {
    const apiKey = input.apiKey ?? process.env.AI_GATEWAY_API_KEY;
    if (!apiKey) throw new Error(`Missing API key for provider "ai-gateway"`);

    const model = input.model ?? DEFAULT_MODELS['ai-gateway'];
    const provider = createGateway({ apiKey });

    return streamText({
      experimental_transform: smoothStream(),
      model: provider(model),
      system: resolveChatSystemPrompt(options),
      messages: await convertToModelMessages(input.messages),
      providerOptions: input.providerOptions,
      headers: { Authorization: `Bearer ${apiKey}` },
    });
  }
}
