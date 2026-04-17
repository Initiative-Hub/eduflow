import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { convertToModelMessages, smoothStream, streamText } from 'ai';
import {
  DEFAULT_MODELS,
  SYSTEM_PROMPT,
} from '@/services/ai/chat-provider.constants';
import type { StreamChatInput } from '@/services/ai/chat-provider.types';
import type { ChatProviderService } from './ChatProviderService';

const PROVIDER_NAME = 'openrouter';

export class OpenRouterService implements ChatProviderService {
  async streamChat(input: StreamChatInput) {
    const apiKey = input.apiKey ?? process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      throw new Error(`Missing API key for provider "${PROVIDER_NAME}"`);
    }

    const model = input.model ?? DEFAULT_MODELS.openrouter;
    const provider = createOpenRouter({ apiKey });

    return streamText({
      experimental_transform: smoothStream(),
      model: provider(model),
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(input.messages),
      providerOptions: input.providerOptions,
    });
  }
}
