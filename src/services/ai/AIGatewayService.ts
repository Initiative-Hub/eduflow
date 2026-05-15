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
import { StorageService } from '../StorageService';
import type { ChatProviderService } from './ChatProviderService';

const PROVIDER_NAME = 'ai-gateway';

// services/ai/chat-provider.constants.ts

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

    if (!apiKey) {
      throw new Error(`Missing API key for provider "${PROVIDER_NAME}"`);
    }

    const model = input.model ?? DEFAULT_MODELS['ai-gateway'];
    return streamText({
      experimental_transform: smoothStream(),
      model: gateway(model),
      system: input.system
        ? `${SYSTEM_PROMPT}\n\n=== ADDITIONAL CONTEXT ===\n${input.system}`
        : SYSTEM_PROMPT,
      messages: await convertToModelMessages(input.messages),
      providerOptions: input.providerOptions,
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
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

    const apiKey = options.apiKey ?? process.env.AI_GATEWAY_API_KEY;
    if (!apiKey) {
      throw new Error(`Missing API key for provider "${PROVIDER_NAME}"`);
    }

    const model = options.model ?? DEFAULT_MODELS['ai-gateway'];

    return streamObject({
      model: gateway(model),
      schema: aiCourseGenerationSchema,
      system: COURSE_GENERATION_PROMPT,
      prompt: `Content to analyze and transform into a course:\n\n${markdownContent}${options.context ? `\n\n=== ADDITIONAL CONTEXT FROM INSTRUCTOR ===\n${options.context}` : ''}`,
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      onFinish: options.onFinish,
    });
  }
}
