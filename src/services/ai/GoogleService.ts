import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { convertToModelMessages, smoothStream, streamText } from 'ai';
import {
  DEFAULT_MODELS,
  SYSTEM_PROMPT,
  safetySettings,
} from '@/services/ai/chat-provider.constants';
import type { StreamChatInput } from '@/services/ai/chat-provider.types';
import type { ChatProviderService } from './ChatProviderService';

const PROVIDER_NAME = 'google';

export class GoogleService implements ChatProviderService {
  async streamChat(input: StreamChatInput) {
    const apiKey = input.apiKey ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
      throw new Error(`Missing API key for provider "${PROVIDER_NAME}"`);
    }

    const model = input.model ?? DEFAULT_MODELS.google;
    const provider = createGoogleGenerativeAI({ apiKey });

    return streamText({
      experimental_transform: smoothStream(),
      model: provider(model),
      providerOptions: {
        ...input.providerOptions,
        google: {
          safetySettings,
          ...(input.providerOptions?.google ?? {}),
        },
      },
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(input.messages),
    });
  }
}
