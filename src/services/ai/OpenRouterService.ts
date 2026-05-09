import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import {
  convertToModelMessages,
  smoothStream,
  streamObject,
  streamText,
} from 'ai';
import { pdfToMarkdown } from '@/lib/pdf';
import { aiCourseGenerationSchema } from '@/lib/validations/course.schema';
import {
  COURSE_GENERATION_PROMPT,
  DEFAULT_MODELS,
  SYSTEM_PROMPT,
} from '@/services/ai/chat-provider.constants';
import type { StreamChatInput } from '@/services/ai/chat-provider.types';
import { StorageService } from '../StorageService';
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

  async streamCourse(options: {
    userId: string;
    fileId?: string;
    file?: File;
    model?: string;
    apiKey?: string;
    providerOptions?: any;
  }) {
    let pdfBuffer: Buffer;

    if (options.fileId) {
      const payload = await StorageService.getDownloadPayload({
        userId: options.userId,
        fileId: options.fileId,
      });
      pdfBuffer = Buffer.from(payload.bytes);
    } else if (options.file) {
      const bytes = await options.file.arrayBuffer();
      pdfBuffer = Buffer.from(bytes);
    } else {
      throw new Error('Missing file or fileId');
    }

    const markdownContent = await pdfToMarkdown(pdfBuffer);

    const apiKey = options.apiKey ?? process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error(`Missing API key for provider "${PROVIDER_NAME}"`);
    }

    const model = options.model ?? DEFAULT_MODELS.openrouter;
    const provider = createOpenRouter({ apiKey });

    return streamObject({
      model: provider(model),
      schema: aiCourseGenerationSchema,
      system: COURSE_GENERATION_PROMPT,
      prompt: `Content to analyze and transform into a course:\n\n${markdownContent}`,
    });
  }
}
