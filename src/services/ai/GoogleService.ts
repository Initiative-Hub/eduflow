import { createGoogleGenerativeAI } from '@ai-sdk/google';
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
  safetySettings,
} from '@/services/ai/chat-provider.constants';
import type {
  StreamChatInput,
  StreamCourseInput,
} from '@/services/ai/chat-provider.types';
import { StorageService } from '../StorageService';
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
      system: input.system
        ? `${SYSTEM_PROMPT}\n\n=== ADDITIONAL CONTEXT ===\n${input.system}`
        : SYSTEM_PROMPT,
      messages: await convertToModelMessages(input.messages),
    });
  }

  async streamCourse(options: StreamCourseInput) {
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

    const apiKey = options.apiKey ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new Error(`Missing API key for provider "${PROVIDER_NAME}"`);
    }

    const model = options.model ?? DEFAULT_MODELS.google;
    const provider = createGoogleGenerativeAI({ apiKey });

    return streamObject({
      model: provider(model),
      schema: aiCourseGenerationSchema,
      system: COURSE_GENERATION_PROMPT,
      prompt: `Content to analyze and transform into a course:\n\n${markdownContent}`,
      onFinish: options.onFinish,
    });
  }
}
