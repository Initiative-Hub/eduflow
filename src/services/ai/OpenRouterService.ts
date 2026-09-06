import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import {
  convertToModelMessages,
  isStepCount,
  smoothStream,
  streamText,
} from 'ai';
import { DEFAULT_MODELS } from '@/services/ai/chat-provider.constants';
import type {
  StreamChatInput,
  StreamChatInternalOptions,
} from '@/services/ai/chat-provider.types';
import { convertLessonReferenceDataPart } from '@/utils/chat-lesson-references';
import type { ChatProviderService } from './ChatProviderService';
import { resolveChatSystemPrompt } from './chat-system-prompt';

export class OpenRouterService implements ChatProviderService {
  async streamChat(
    input: StreamChatInput,
    options?: StreamChatInternalOptions
  ) {
    const apiKey = input.apiKey ?? process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error(`Missing API key for provider "openrouter"`);

    const model = input.model ?? DEFAULT_MODELS.openrouter;
    const provider = createOpenRouter({ apiKey });

    return streamText({
      experimental_transform: smoothStream(),
      model: provider(model),
      instructions: resolveChatSystemPrompt(
        options?.prompt ?? '',
        options?.customInstructions
      ),
      messages: await convertToModelMessages(input.messages, {
        convertDataPart: convertLessonReferenceDataPart,
      }),
      tools: options?.tools,
      stopWhen: options?.maxSteps ? isStepCount(options.maxSteps) : undefined,
    });
  }
}
