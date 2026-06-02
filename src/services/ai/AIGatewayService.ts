import {
  convertToModelMessages,
  createGateway,
  smoothStream,
  streamObject,
  streamText,
} from 'ai';
import { pdfToMarkdown } from '@/lib/pdf';
import { aiCourseGenerationSchema } from '@/lib/validations/course.schema';
import {
  COURSE_GENERATION_PROMPT,
  DEFAULT_MODELS,
} from '@/services/ai/chat-provider.constants';
import type {
  StreamChatInput,
  StreamChatInternalOptions,
  StreamCourseInput,
} from '@/services/ai/chat-provider.types';
import { WebSearchService } from '@/services/WebSearchService';
import { StorageService } from '../StorageService';
import type { ChatProviderService } from './ChatProviderService';
import { resolveChatSystemPrompt } from './chat-system-prompt';
import type { CourseStreamEvent } from './course-stream.types';

const PROVIDER_NAME = 'ai-gateway';

export class AIGatewayService implements ChatProviderService {
  async streamChat(
    input: StreamChatInput,
    options?: StreamChatInternalOptions
  ) {
    const apiKey = input.apiKey ?? process.env.AI_GATEWAY_API_KEY;
    if (!apiKey)
      throw new Error(`Missing API key for provider "${PROVIDER_NAME}"`);

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

  /**
   * Streams course generation as NDJSON events into a WritableStreamDefaultWriter.
   * Sequence: extract → search → generate (delta chunks) → done
   * The caller wraps this with 'save' before closing the writer.
   */
  async streamCourseToWriter(
    options: StreamCourseInput,
    writer: WritableStreamDefaultWriter<string>
  ): Promise<void> {
    const emit = async (event: CourseStreamEvent) =>
      writer.write(`${JSON.stringify(event)}\n`);

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
      5,
      true
    );

    const apiKey = options.apiKey ?? process.env.AI_GATEWAY_API_KEY;
    if (!apiKey)
      throw new Error(`Missing API key for provider "${PROVIDER_NAME}"`);

    const model = options.model ?? DEFAULT_MODELS['ai-gateway'];
    const provider = createGateway({ apiKey });

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
      headers: { Authorization: `Bearer ${apiKey}` },
      onFinish: options.onFinish,
    });

    for await (const chunk of aiStream.textStream) {
      await emit({ type: 'generate', delta: chunk });
    }

    // Await the full object so onFinish fires before we emit 'done'
    await aiStream.object;
    await emit({ type: 'done' });
  }
}
