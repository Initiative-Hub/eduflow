import { convertToModelMessages, gateway, smoothStream, streamText } from 'ai';
import {
  DEFAULT_MODELS,
  SYSTEM_PROMPT,
} from '@/services/ai/chat-provider.constants';
import type { StreamChatInput } from '@/services/ai/chat-provider.types';
import type { ChatProviderService } from './ChatProviderService';

const PROVIDER_NAME = 'ai-gateway';

export class AIGatewayService implements ChatProviderService {
  async streamChat(input: StreamChatInput) {
    const apiKey = input.apiKey ?? process.env.AI_GATEWAY_API_KEY;

    if (!apiKey) {
      throw new Error(`Missing API key for provider "${PROVIDER_NAME}"`);
    }

    const model = input.model ?? DEFAULT_MODELS['ai-gateway'];
    return streamText({
      experimental_transform: smoothStream(),
      model: gateway(model),
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(input.messages),
      providerOptions: input.providerOptions,
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
  }
}
