import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import {
  convertToModelMessages,
  smoothStream,
  streamObject,
  streamText,
  generateObject,
} from 'ai';
import { z } from 'zod';
import { pdfToMarkdown } from '@/lib/pdf';
import { aiCourseGenerationSchema } from '@/lib/validations/course.schema';
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

    // Define Zod helper constructor for the complete Quiz structure
    const createQuizSchema = (questionSchema: any) =>
      z.object({
        title: z
          .string()
          .describe('An engaging, descriptive title for the quiz'),
        description: z
          .string()
          .describe('A summary of what this quiz will test'),
        category: z
          .enum(['SELECTION_BASED', 'OPEN_ENDED'])
          .describe('Category of the quiz'),
        subType: z
          .enum([
            'MULTIPLE_CHOICE',
            'TRUE_FALSE',
            'MATCHING',
            'ORDERING',
            'ESSAY',
            'FILL_IN_THE_BLANK',
            'DRAG_AND_DROP',
          ])
          .describe('The subType/format of questions in this quiz'),
        deliveryMode: z
          .enum(['INSTANT_FEEDBACK', 'POST_QUIZ_REVIEW'])
          .describe('How feedback is delivered to the student'),
        selectionMethod: z
          .enum(['HAND_PICK', 'RANDOM', 'MANUAL_CREATE'])
          .describe('Method used to select questions'),
        questionCount: z
          .number()
          .int()
          .describe('Total number of questions in the quiz'),
        questions: z
          .array(questionSchema)
          .describe('The list of generated questions'),
      });

    // Define type-specific Zod question schemas
    const multipleChoiceQuestionSchema = z.object({
      type: z.literal('multiple-choice'),
      prompt: z.string().describe('The question text or prompt'),
      options: z
        .array(
          z.object({
            id: z
              .string()
              .describe('Unique ID for this option (e.g. "opt1", "opt2")'),
            text: z.string().describe('Option text'),
            isCorrect: z
              .boolean()
              .describe('Whether this option is the correct answer'),
          })
        )
        .min(2)
        .max(6)
        .describe(
          'List of multiple choice options (exactly one must be correct)'
        ),
      explanation: z
        .string()
        .optional()
        .describe('Brief explanation of why the correct option is correct'),
    });

    const trueFalseQuestionSchema = z.object({
      type: z.literal('true-false'),
      prompt: z.string().describe('The question text or prompt'),
      correctAnswer: z.boolean().describe('The correct answer (true or false)'),
      explanation: z
        .string()
        .optional()
        .describe('Brief explanation of why the answer is true or false'),
    });

    const fillInTheBlankQuestionSchema = z.object({
      type: z.literal('fill-in-the-blank'),
      promptTemplate: z
        .string()
        .describe(
          'Sentence template with blanks denoted by {{blankId}} placeholders (e.g., "The capital of France is {{blank1}}.")'
        ),
      blanks: z
        .array(
          z.object({
            id: z
              .string()
              .describe('ID matching the template placeholder (e.g. "blank1")'),
            acceptableAnswers: z
              .array(z.string())
              .describe('Acceptable correct answers (case-insensitive)'),
          })
        )
        .describe('List of blanks in the template'),
      explanation: z
        .string()
        .optional()
        .describe('Explanation of correct answer'),
    });

    const matchingQuestionSchema = z.object({
      type: z.literal('matching'),
      prompt: z.string().describe('Prompt introducing matching challenge'),
      leftItems: z.array(
        z.object({
          id: z.string().describe('Unique ID for the left item (e.g. "left1")'),
          text: z.string().describe('Left item text'),
        })
      ),
      rightItems: z.array(
        z.object({
          id: z
            .string()
            .describe('Unique ID for the right item (e.g. "right1")'),
          text: z.string().describe('Right item text'),
        })
      ),
      correctPairs: z
        .array(
          z.object({
            leftId: z.string().describe('The ID of the left item'),
            rightId: z.string().describe('The ID of the matching right item'),
          })
        )
        .describe('List of matching pairs between left and right items'),
      explanation: z
        .string()
        .optional()
        .describe('Explanation of correct matches'),
    });

    const orderingQuestionSchema = z.object({
      type: z.literal('ordering'),
      prompt: z.string().describe('Prompt instructing what to order'),
      items: z
        .array(
          z.object({
            id: z.string().describe('Unique ID for this item (e.g. "item1")'),
            text: z.string().describe('Item text'),
          })
        )
        .describe('List of items to be ordered'),
      correctOrder: z
        .array(z.string())
        .describe('List of item IDs in the correct order'),
      explanation: z
        .string()
        .optional()
        .describe('Explanation of correct ordering'),
    });

    const dragAndDropQuestionSchema = z.object({
      type: z.literal('drag-and-drop'),
      prompt: z.string().describe('Prompt for drag and drop'),
      sentenceTemplate: z
        .string()
        .describe('Sentence template with {{zoneId}} placeholders'),
      zones: z.array(
        z.object({
          id: z
            .string()
            .describe(
              'The ID of the drop zone matching the template placeholder (e.g. "zone1")'
            ),
          label: z.string().describe('Label or hint for this zone'),
        })
      ),
      items: z.array(
        z.object({
          id: z
            .string()
            .describe('Unique ID for the draggable item (e.g. "item1")'),
          text: z.string().describe('Draggable item text'),
        })
      ),
      correctMapping: z
        .record(z.string(), z.string())
        .describe('Correct mapping from zoneId to itemId'),
      explanation: z
        .string()
        .optional()
        .describe('Explanation of the correct mapping'),
    });

    const essayQuestionSchema = z.object({
      type: z.literal('essay'),
      prompt: z.string().describe('The essay prompt or question'),
      rubric: z
        .array(
          z.object({
            id: z
              .string()
              .describe('Unique ID for this criterion (e.g. "crit1")'),
            label: z
              .string()
              .describe('Name of the criterion (e.g. "Grammar")'),
            description: z
              .string()
              .describe('Detailed description of what is expected'),
            maxPoints: z
              .number()
              .int()
              .describe('Maximum points for this criterion'),
          })
        )
        .optional()
        .describe('Rubric criteria for grading the essay'),
      minWords: z.number().int().optional().describe('Minimum word count'),
      maxWords: z.number().int().optional().describe('Maximum word count'),
      allowAttachments: z
        .boolean()
        .optional()
        .describe('Whether file attachments are allowed'),
      deliveryOption: z
        .enum(['immediate', 'teacher-review'])
        .optional()
        .describe('How AI feedback is delivered'),
      allowTeacherRubric: z
        .boolean()
        .optional()
        .describe('Whether custom teacher rubrics are allowed'),
      explanation: z
        .string()
        .optional()
        .describe('Explanation or model answer guidelines'),
    });

    const timedChallengeQuestionSchema = z.object({
      type: z.literal('timed-challenge'),
      prompt: z
        .string()
        .describe('The prompt or introduction of the timed challenge'),
      timeLimitSeconds: z.number().int().describe('Time limit in seconds'),
      innerQuestion: z
        .object({
          type: z.enum(['multiple-choice', 'true-false']),
          prompt: z.string().describe('The question text or prompt'),
          options: z
            .array(
              z.object({
                id: z.string(),
                text: z.string(),
                isCorrect: z.boolean(),
              })
            )
            .optional()
            .describe(
              'Only for multiple-choice inner questions (exactly one correct)'
            ),
          correctAnswer: z
            .boolean()
            .optional()
            .describe('Only for true-false inner questions'),
        })
        .describe('The question wrapped by the timed challenge'),
      explanation: z
        .string()
        .optional()
        .describe('Brief explanation of the answer'),
    });

    let targetQuestionSchema: any;
    const normalizedType = options.quizType.toLowerCase();

    if (normalizedType === 'multiple-choice') {
      targetQuestionSchema = multipleChoiceQuestionSchema;
    } else if (normalizedType === 'true-false') {
      targetQuestionSchema = trueFalseQuestionSchema;
    } else if (normalizedType === 'fill-in-the-blank') {
      targetQuestionSchema = fillInTheBlankQuestionSchema;
    } else if (normalizedType === 'matching') {
      targetQuestionSchema = matchingQuestionSchema;
    } else if (normalizedType === 'ordering') {
      targetQuestionSchema = orderingQuestionSchema;
    } else if (normalizedType === 'drag-and-drop') {
      targetQuestionSchema = dragAndDropQuestionSchema;
    } else if (normalizedType === 'essay') {
      targetQuestionSchema = essayQuestionSchema;
    } else if (normalizedType === 'timed-challenge') {
      targetQuestionSchema = timedChallengeQuestionSchema;
    } else {
      targetQuestionSchema = multipleChoiceQuestionSchema;
    }

    const targetSchema = createQuizSchema(targetQuestionSchema);
    const count = parseInt(options.questionNumbers, 10) || 5;
    const prompt = `Generate a complete, high-quality educational Quiz object containing exactly ${count} questions of type "${options.quizType}".
${options.topic ? `The quiz topic or theme is: "${options.topic}".` : ''}
${options.content ? `Generate the quiz based on the following content:\n\n${options.content}` : 'Generate interesting educational questions.'}

Instructions:
1. Provide a clear, engaging title and description for the quiz.
2. Select appropriate category, subType, deliveryMode, and selectionMethod matching the quizType.
3. Generate exactly ${count} questions in the questions array matching the schema requirements.
4. Ensure all option, blank, zone, and item IDs are unique (e.g. opt1, opt2, blank1, zone1, item1, left1, right1).
5. Provide helpful explanations for each question.`;

    const response = await generateObject({
      model: provider(model),
      schema: targetSchema,
      prompt: prompt,
      system:
        'You are an educational AI assistant that designs quiz questions and tests. Generate high-quality quizzes and questions matching the requested schema.',
    });

    return response.object;
  }
}
