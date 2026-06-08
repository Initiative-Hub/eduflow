import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { convertToModelMessages, smoothStream, streamText } from 'ai';
import {
  DEFAULT_MODELS,
  safetySettings,
} from '@/services/ai/chat-provider.constants';
import type {
  StreamChatInput,
  StreamChatInternalOptions,
} from '@/services/ai/chat-provider.types';
import type { ChatProviderService } from './ChatProviderService';
import { resolveChatSystemPrompt } from './chat-system-prompt';

export class GoogleService implements ChatProviderService {
  async streamChat(
    input: StreamChatInput,
    options?: StreamChatInternalOptions
  ) {
    const apiKey = input.apiKey ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
      throw new Error(`Missing API key for provider "google"`);
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
      system: resolveChatSystemPrompt(options),
      messages: await convertToModelMessages(input.messages),
    });
  }
}
