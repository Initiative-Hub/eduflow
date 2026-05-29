import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import {
  convertToModelMessages,
  generateObject,
  smoothStream,
  streamObject,
  streamText,
} from 'ai';
import { z } from 'zod';
import { pdfToMarkdown } from '@/lib/pdf';
import { aiCourseGenerationSchema } from '@/lib/validations/course.schema';
import {
  createQuizSchema,
  dragAndDropQuestionSchema,
  essayQuestionSchema,
  fillInTheBlankQuestionSchema,
  matchingQuestionSchema,
  multipleChoiceQuestionSchema,
  orderingQuestionSchema,
  timedChallengeQuestionSchema,
  trueFalseQuestionSchema,
} from '@/lib/validations/quiz.schema';
import {
  COURSE_GENERATION_PROMPT,
  DEFAULT_MODELS,
  SYSTEM_PROMPT,
} from '@/services/ai/chat-provider.constants';
import type {
  AIQuizInput,
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

  // Create quiz based on quiz type
  async createQuiz(options: AIQuizInput) {
    const apiKey = options.apiKey ?? process.env.OPENROUTER_API_KEY;
    if (!apiKey)
      throw new Error(`Missing API key for provider "${PROVIDER_NAME}"`);

    const model = options.model ?? DEFAULT_MODELS.openrouter;
    const provider = createOpenRouter({ apiKey });

    const normalizedType = options.quizType.toLowerCase();

    // Build AI-friendly question schemas with the `type` discriminator field REMOVED.
    // The AI reliably omits or mis-capitalises the `type` field when it's a required literal,
    // so we strip it from the schema sent to the model and inject the correct value ourselves
    // after generation.
    const aiQuestionSchemaMap: Record<string, z.ZodTypeAny> = {
      'multiple-choice': multipleChoiceQuestionSchema.omit({ type: true }),
      'true-false': trueFalseQuestionSchema.omit({ type: true }),
      'fill-in-the-blank': fillInTheBlankQuestionSchema.omit({ type: true }),
      'matching': matchingQuestionSchema.omit({ type: true }),
      'ordering': orderingQuestionSchema.omit({ type: true }),
      'drag-and-drop': dragAndDropQuestionSchema.omit({ type: true }),
      'essay': essayQuestionSchema.omit({ type: true }),
      'timed-challenge': timedChallengeQuestionSchema.omit({ type: true }),
    };

    const aiQuestionSchema =
      aiQuestionSchemaMap[normalizedType] ??
      aiQuestionSchemaMap['multiple-choice'];

    const aiSchema = createQuizSchema(aiQuestionSchema);

    const count = parseInt(options.questionNumbers, 10) || 5;
    const prompt = `Generate a complete, high-quality educational Quiz object containing exactly ${count} questions of type "${options.quizType}".
${options.topic ? `The quiz topic or theme is: "${options.topic}".` : ''}
${options.content ? `Generate the quiz based on the following content:\n\n${options.content}` : 'Generate interesting educational questions.'}

Instructions:
1. Provide a clear, engaging title and description for the quiz.
2. Set category, subType, deliveryMode, and selectionMethod appropriately for the quizType.
3. Generate exactly ${count} questions in the questions array.
4. Ensure all option, blank, zone, and item IDs are unique (e.g. opt1, opt2, blank1, zone1, item1, left1, right1).
5. Provide helpful explanations for each question.`;

    const response = await generateObject({
      model: provider(model),
      schema: aiSchema,
      prompt,
      system:
        'You are an educational AI assistant that designs quiz questions and tests. Generate high-quality quizzes and questions matching the requested schema.',
    });

    // Inject the correct `type` field into every question (the AI schema omitted it)
    const questionsWithType = (response.object.questions as Record<string, unknown>[]).map(
      (q) => ({ type: normalizedType, ...q })
    );

    return { ...response.object, questions: questionsWithType };
  }
}
