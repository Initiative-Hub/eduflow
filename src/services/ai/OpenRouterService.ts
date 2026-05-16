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
import type {
  StreamChatInput,
  StreamCourseInput,
} from '@/services/ai/chat-provider.types';
import { WebSearchService } from '@/services/WebSearchService';
import { StorageService } from '../StorageService';
import type { ChatProviderService } from './ChatProviderService';
import type { CourseStreamEvent } from './course-stream.types';

const PROVIDER_NAME = 'openrouter';

export class OpenRouterService implements ChatProviderService {
  async streamChat(input: StreamChatInput) {
    const apiKey = input.apiKey ?? process.env.OPENROUTER_API_KEY;
    if (!apiKey)
      throw new Error(`Missing API key for provider "${PROVIDER_NAME}"`);

    const model = input.model ?? DEFAULT_MODELS.openrouter;
    const provider = createOpenRouter({ apiKey });

    return streamText({
      experimental_transform: smoothStream(),
      model: provider(model),
      system: input.system
        ? `${SYSTEM_PROMPT}\n\n=== ADDITIONAL CONTEXT ===\n${input.system}`
        : SYSTEM_PROMPT,
      messages: await convertToModelMessages(input.messages),
      providerOptions: input.providerOptions,
    });
  }

  /**
   * Streams course generation as NDJSON events into a WritableStreamDefaultWriter.
   * Sequence: extract → search → generate (delta chunks) → done
   */
  async streamCourseToWriter(
    options: StreamCourseInput,
    writer: WritableStreamDefaultWriter<string>
  ): Promise<void> {
    const emit = async (event: CourseStreamEvent) =>
      writer.write(JSON.stringify(event) + '\n');

    // Step 1 — extract PDF
    await emit({ type: 'extract' });

    let pdfBuffer: Buffer;
    if (options.fileId) {
      const payload = await StorageService.getDownloadPayload({
        userId: options.userId,
        fileId: options.fileId,
      });
      pdfBuffer = Buffer.from(payload.bytes);
    } else if (options.file) {
      pdfBuffer = Buffer.from(await options.file.arrayBuffer());
    } else {
      throw new Error('Missing file or fileId');
    }

    const markdownContent = await pdfToMarkdown(pdfBuffer);

    // Step 2 — web search
    await emit({ type: 'search' });

    const searchQuery = options.context
      ? `${options.context} ${markdownContent.slice(0, 150)}`
      : markdownContent.slice(0, 200);
    const webContext = await WebSearchService.search(
      searchQuery.trim(),
      3,
      true
    );

    const apiKey = options.apiKey ?? process.env.OPENROUTER_API_KEY;
    if (!apiKey)
      throw new Error(`Missing API key for provider "${PROVIDER_NAME}"`);

    const model = options.model ?? DEFAULT_MODELS.openrouter;
    const provider = createOpenRouter({ apiKey });

    // Step 3 — AI generation: stream raw text deltas
    const aiStream = streamObject({
      model: provider(model),
      schema: aiCourseGenerationSchema,
      system: COURSE_GENERATION_PROMPT,
      prompt: `Content to analyze and transform into a course:\n\n${markdownContent}${
        options.context
          ? `\n\n=== ADDITIONAL CONTEXT FROM INSTRUCTOR ===\n${options.context}`
          : ''
      }\n\n=== SUPPLEMENTARY WEB CONTEXT ===\nUse the following web search results to enrich lesson content with current, real-world examples and up-to-date information:\n\n${webContext}`,
      onFinish: options.onFinish,
    });

    for await (const chunk of aiStream.textStream) {
      await emit({ type: 'generate', delta: chunk });
    }

    // Await the full object so onFinish fires before we emit 'done'
    await aiStream.object;
    await emit({ type: 'done' });
  }

  // Legacy method kept for ChatProviderService interface compatibility
  async streamCourse(options: StreamCourseInput) {
    let pdfBuffer: Buffer;
    if (options.fileId) {
      const payload = await StorageService.getDownloadPayload({
        userId: options.userId,
        fileId: options.fileId,
      });
      pdfBuffer = Buffer.from(payload.bytes);
    } else if (options.file) {
      pdfBuffer = Buffer.from(await options.file.arrayBuffer());
    } else {
      throw new Error('Missing file or fileId');
    }
    const markdownContent = await pdfToMarkdown(pdfBuffer);
    const searchQuery = options.context
      ? `${options.context} ${markdownContent.slice(0, 150)}`
      : markdownContent.slice(0, 200);
    const webContext = await WebSearchService.search(
      searchQuery.trim(),
      5,
      true
    );
    const apiKey = options.apiKey ?? process.env.OPENROUTER_API_KEY;
    if (!apiKey)
      throw new Error(`Missing API key for provider "${PROVIDER_NAME}"`);
    const model = options.model ?? DEFAULT_MODELS.openrouter;
    const provider = createOpenRouter({ apiKey });
    return streamObject({
      model: provider(model),
      schema: aiCourseGenerationSchema,
      system: COURSE_GENERATION_PROMPT,
      prompt: `Content to analyze and transform into a course:\n\n${markdownContent}${options.context ? `\n\n=== ADDITIONAL CONTEXT FROM INSTRUCTOR ===\n${options.context}` : ''}\n\n=== SUPPLEMENTARY WEB CONTEXT ===\n${webContext}`,
      onFinish: options.onFinish,
    });
  }
}
