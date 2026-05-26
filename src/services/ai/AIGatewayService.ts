import {
  convertToModelMessages,
  gateway,
  smoothStream,
  streamObject,
  streamText,
} from 'ai';
import { pdfToMarkdown } from '@/lib/pdf';
import { aiCourseGenerationSchema } from '@/lib/validations/course.schema';
import {
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

const PROVIDER_NAME = 'ai-gateway';

export const COURSE_GENERATION_PROMPT = `
You are an expert Academic Curriculum Designer and Subject Matter Expert. 
Your goal is to transform raw document text into a high-quality, structured learning experience.

### GUIDELINES:
1. **Logical Progression:** Organize modules so that prerequisite knowledge is covered first.
2. **Information Synthesis:** Do not simply summarize; identify the core "learning pillars" within the document.
3. **Clarity:** Lesson titles should be action-oriented and clear.
4. **Noise Reduction:** Ignore document artifacts like page numbers, headers, footers, and bibliographies.
5. **Pedagogy:** Ensure each module has a clear learning objective that explains what the student will be able to DO after finishing it.

### FORMATTING:
- Output must be strictly valid JSON.
- Do not include conversational filler (e.g., "Here is your course...").
- Ensure the difficulty level is consistent throughout the course.
`;

export class AIGatewayService implements ChatProviderService {
  async streamChat(input: StreamChatInput) {
    const apiKey = input.apiKey ?? process.env.AI_GATEWAY_API_KEY;
    if (!apiKey)
      throw new Error(`Missing API key for provider "${PROVIDER_NAME}"`);

    const model = input.model ?? DEFAULT_MODELS['ai-gateway'];
    return streamText({
      experimental_transform: smoothStream(),
      model: gateway(model),
      system: input.system
        ? `${SYSTEM_PROMPT}\n\n=== ADDITIONAL CONTEXT ===\n${input.system}`
        : SYSTEM_PROMPT,
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
      5,
      true
    );

    const apiKey = options.apiKey ?? process.env.AI_GATEWAY_API_KEY;
    if (!apiKey)
      throw new Error(`Missing API key for provider "${PROVIDER_NAME}"`);

    const model = options.model ?? DEFAULT_MODELS['ai-gateway'];

    // Step 3 — AI generation: stream raw text deltas
    const aiStream = streamObject({
      model: gateway(model),
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
    const apiKey = options.apiKey ?? process.env.AI_GATEWAY_API_KEY;
    if (!apiKey)
      throw new Error(`Missing API key for provider "${PROVIDER_NAME}"`);
    const model = options.model ?? DEFAULT_MODELS['ai-gateway'];
    return streamObject({
      model: gateway(model),
      schema: aiCourseGenerationSchema,
      system: COURSE_GENERATION_PROMPT,
      prompt: `Content to analyze and transform into a course:\n\n${markdownContent}${options.context ? `\n\n=== ADDITIONAL CONTEXT FROM INSTRUCTOR ===\n${options.context}` : ''}\n\n=== SUPPLEMENTARY WEB CONTEXT ===\n${webContext}`,
      headers: { Authorization: `Bearer ${apiKey}` },
      onFinish: options.onFinish,
    });
  }
}
