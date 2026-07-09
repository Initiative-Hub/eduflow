import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { convertToModelMessages, generateText, tool } from 'ai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const mocks = vi.hoisted(() => ({
  convertToModelMessages: vi.fn(async (messages) => messages),
  generateText: vi.fn(),
  provider: vi.fn((model: string) => `model:${model}`),
}));

vi.mock('ai', async (importOriginal) => ({
  ...(await importOriginal<typeof import('ai')>()),
  convertToModelMessages: mocks.convertToModelMessages,
  generateText: mocks.generateText,
}));

vi.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: vi.fn(() => mocks.provider),
}));

vi.mock('zod', async () => {
  const actual = await vi.importActual<typeof import('zod')>('zod');
  return {
    ...actual,
    z: actual.z ?? actual,
  };
});

vi.mock('@/lib/validations/quiz.schema', async () => {
  const actual = await vi.importActual<typeof import('zod')>('zod');
  const zod = actual.z ?? actual;
  const questionSchema = zod.object({
    explanation: zod.string().optional(),
    prompt: zod.string(),
    type: zod.string(),
  });

  return {
    fillInTheBlankQuestionSchema: questionSchema,
    multipleChoiceQuestionSchema: questionSchema,
    trueFalseQuestionSchema: questionSchema,
  };
});

vi.mock('@/lib/validations/study.schema', async () => {
  const actual = await vi.importActual<typeof import('zod')>('zod');
  const zod = actual.z ?? actual;

  return {
    DEFAULT_STUDY_QUIZ_OPTIONS: {
      questionCount: 10,
      questionTypes: ['multiple_choice', 'true_false', 'fill_in_the_blank'],
    },
    studyQuizQuestionTypeSchema: zod.enum([
      'multiple_choice',
      'true_false',
      'fill_in_the_blank',
    ]),
  };
});

const mockCreateOpenRouter = createOpenRouter as unknown as ReturnType<
  typeof vi.fn
>;
const mockConvertToModelMessages =
  convertToModelMessages as unknown as ReturnType<typeof vi.fn>;
const mockGenerateText = generateText as unknown as ReturnType<typeof vi.fn>;

describe('study practice quiz generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENROUTER_API_KEY = 'test-key';
    mockGenerateText
      .mockResolvedValueOnce({
        output: {
          hasExplicitQuizOptions: false,
          questionCount: null,
          questionTypes: null,
        },
      })
      .mockResolvedValueOnce({
        response: {
          messages: [],
        },
      })
      .mockResolvedValueOnce({
        output: {
          description: 'Review core biology concepts.',
          fillInTheBlank: [
            {
              blanks: [{ answer: 'chlorophyll', id: 'blank1' }],
              explanation: 'Chlorophyll captures light energy.',
              template: '{{blank1}} captures light energy.',
            },
            {
              blanks: [{ answer: 'glucose', id: 'blank1' }],
              explanation: 'Glucose stores chemical energy.',
              template: 'Plants produce {{blank1}}.',
            },
          ],
          multipleChoice: Array.from({ length: 5 }, (_, index) => ({
            correctOptionId: 'a',
            explanation: 'Photosynthesis converts light into stored energy.',
            options: [
              { id: 'a', text: 'Photosynthesis' },
              { id: 'b', text: 'Respiration' },
              { id: 'c', text: 'Fermentation' },
              { id: 'd', text: 'Digestion' },
            ],
            prompt: `Question ${index + 1}`,
          })),
          title: 'Photosynthesis Practice',
          trueFalse: Array.from({ length: 3 }, (_, index) => ({
            answer: true,
            explanation: 'The statement is true.',
            prompt: `True false ${index + 1}`,
          })),
        },
      });
  });

  it('lets the model decide whether to call lesson RAG tools before structured quiz output', async () => {
    const { generatePracticeQuiz } = await import(
      '@/app/api/v1/ai/study/[chatId]/practice-quiz'
    );
    const tools = {
      searchLessonContent: tool({
        description: 'Search lesson content',
        inputSchema: z.object({ query: z.string() }),
      }),
    };

    await generatePracticeQuiz({
      messages: [
        {
          id: 'message-1',
          parts: [{ text: 'Make a quiz about photosynthesis', type: 'text' }],
          role: 'user',
        },
      ],
      tools,
      maxSteps: 5,
    });

    expect(mockCreateOpenRouter).toHaveBeenCalledWith({ apiKey: 'test-key' });
    expect(mockConvertToModelMessages).toHaveBeenCalled();
    expect(mockGenerateText).toHaveBeenCalledTimes(3);
    expect(mockGenerateText.mock.calls[1][0]).toMatchObject({ tools });
    expect(mockGenerateText.mock.calls[1][0].stopWhen).toBeDefined();
    expect(mockGenerateText.mock.calls[2][0]).toMatchObject({
      output: expect.any(Object),
      instructions: expect.any(String),
    });
  });
});
