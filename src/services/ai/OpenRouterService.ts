import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import {
  convertToModelMessages,
  generateText,
  Output,
  smoothStream,
  streamText,
} from 'ai';
import type { z } from 'zod';
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
} from '@/services/ai/chat-provider.constants';
import type {
  AIQuizInput,
  StreamChatInput,
  StreamChatInternalOptions,
  StreamCourseInput,
} from '@/services/ai/chat-provider.types';
import { generateSupplementarySearchContexts } from '@/services/ai/web-search';
import type { CourseStreamEvent } from '@/types/course-stream-event';
import { StorageService } from '../StorageService';
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
      system: resolveChatSystemPrompt(options),
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

    const apiKey = options.apiKey ?? process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error(`Missing API key for provider "openrouter"`);

    const model = options.model ?? DEFAULT_MODELS.openrouter;
    const provider = createOpenRouter({ apiKey });

    const { webContext, youtubeContext } =
      await generateSupplementarySearchContexts({
        model: provider(model),
        searchQuery,
        providerOptions: options.providerOptions,
        onSource: async ({ sourceKind, source }) => {
          await emit({ type: 'source-found', sourceKind, source });
        },
        onSearchComplete: async ({ sourceKind, count }) => {
          await emit({ type: 'search-complete', sourceKind, count });
        },
      });
    const webContextJSON = JSON.stringify(webContext, null, 2);
    const youtubeContextJSON = JSON.stringify(youtubeContext, null, 2);

    // Step 3 — AI generation: stream raw text deltas
    const result = streamText({
      model: provider(model),
      output: Output.object({ schema: aiCourseGenerationSchema }),
      system: COURSE_GENERATION_PROMPT,
      prompt: `
        Content to analyze and transform into a course:
        
        ${markdownContent}
        
        ${
          options.context
            ? `=== ADDITIONAL CONTEXT FROM INSTRUCTOR ===\n${options.context}`
            : ''
        }
      
        === SUPPLEMENTARY WEB CONTEXT ===
        Use the following web search results to enrich lesson content with current, real-world examples and up-to-date information:
        
        ${webContextJSON}
        
        === SUPPLEMENTARY YOUTUBE VIDEOS ===
        For each module or lesson, pick the most relevant YouTube video from the list below if it matches the topic, and embed it at the end of the lesson's Tiptap JSON content as a youtube node.
        Extract the 11-character video ID from the search results and set the node attrs to {"src":"https://www.youtube.com/watch?v=VIDEO_ID","width":640,"height":480}.
        Do NOT output standard links, iframes, divs, or plain paragraphs for the YouTube video URL. Only choose relevant videos from this list:

        ${youtubeContextJSON}
      `,
      providerOptions: options.providerOptions,
    });

    for await (const chunk of result.textStream) {
      await emit({ type: 'generate', delta: chunk });
    }

    const generatedCourse = await result.output;
    await options.onFinish?.({ object: generatedCourse });
    await emit({ type: 'done' });
  }

  // Create quiz based on quiz type
  async createQuiz(options: AIQuizInput) {
    const apiKey = options.apiKey ?? process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error(`Missing API key for provider "openrouter"`);

    const model = options.model ?? DEFAULT_MODELS.openrouter;
    const provider = createOpenRouter({ apiKey });

    const normalizedType = options.quizType.toLowerCase();

    // Build AI-friendly question schemas with the `type` discriminator field REMOVED.
    // The AI reliably omits or mis-capitalises the `type` field when it's a required literal,
    // so we strip it from the schema sent to the model and inject the correct value ourselves
    // after generation.
    const aiQuestionSchemaMap: Record<string, z.ZodTypeAny> = {
      multiple_choice: multipleChoiceQuestionSchema.omit({ type: true }),
      true_false: trueFalseQuestionSchema.omit({ type: true }),
      fill_in_the_blank: fillInTheBlankQuestionSchema.omit({ type: true }),
      matching: matchingQuestionSchema.omit({ type: true }),
      ordering: orderingQuestionSchema.omit({ type: true }),
      drag_and_drop: dragAndDropQuestionSchema.omit({ type: true }),
      essay: essayQuestionSchema.omit({ type: true }),
      timed_challenge: timedChallengeQuestionSchema.omit({ type: true }),
    };

    const aiQuestionSchema =
      aiQuestionSchemaMap[normalizedType] ??
      aiQuestionSchemaMap.multiple_choice;

    const aiSchema = createQuizSchema(aiQuestionSchema);

    const count = parseInt(options.questionNumbers, 10) || 5;
    const prompt = `
      Generate a complete, high-quality educational Quiz object containing exactly ${count} questions of type "${options.quizType}".
      ${options.topic ? `The quiz topic or theme is: "${options.topic}".` : ''}
      ${options.content ? `Generate the quiz based on the following content:\n\n${options.content}` : 'Generate interesting educational questions.'}

      Instructions:
      1. Provide a clear, engaging title and description for the quiz.
      2. Set category, subType, deliveryMode, and selectionMethod appropriately for the quizType.
      3. Generate exactly ${count} questions in the questions array.
      4. Ensure all option, blank, zone, and item IDs are unique (e.g. opt1, opt2, blank1, zone1, item1, left1, right1).
      5. Provide helpful explanations for each question.
    `;

    const response = await generateText({
      model: provider(model),
      output: Output.object({ schema: aiSchema }),
      prompt,
      system:
        'You are an educational AI assistant that designs quiz questions and tests. Generate high-quality quizzes and questions matching the requested schema.',
    });

    // Inject the correct `type` field into every question (the AI schema omitted it)
    const questionsWithType = (
      response.output.questions as Record<string, unknown>[]
    ).map((q) => ({ type: normalizedType, ...q }));

    return { ...response.output, questions: questionsWithType };
  }
}
