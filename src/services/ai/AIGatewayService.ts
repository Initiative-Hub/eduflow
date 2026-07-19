import {
  convertToModelMessages,
  createGateway,
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
      instructions: resolveChatSystemPrompt(options?.prompt ?? ''),
      messages: await convertToModelMessages(input.messages, {
        convertDataPart: convertLessonReferenceDataPart,
      }),
      tools: options?.tools,
      stopWhen: options?.maxSteps ? isStepCount(options.maxSteps) : undefined,
    });
  }
}
