import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameQuizAIService } from '@/services/GameQuizAIService';

const mocks = vi.hoisted(() => ({
  courseFindFirst: vi.fn(),
  generateText: vi.fn(),
  provider: vi.fn((model: string) => `model:${model}`),
  transaction: vi.fn(),
  gameQuizCreate: vi.fn(),
  gameQuizUpdate: vi.fn(),
  questionCreate: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    course: {
      findFirst: mocks.courseFindFirst,
    },
    gameQuiz: {
      create: mocks.gameQuizCreate,
      update: mocks.gameQuizUpdate,
    },
    gameQuizQuestion: {
      create: mocks.questionCreate,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock('ai', async (importOriginal) => ({
  ...(await importOriginal<typeof import('ai')>()),
  generateText: mocks.generateText,
}));

vi.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: vi.fn(() => mocks.provider),
}));

const USER_ID = 'user-1';
const COURSE_ID = '11111111-1111-4111-8111-111111111111';
const MODULE_ID = '22222222-2222-4222-8222-222222222222';
const LESSON_1_ID = '33333333-3333-4333-8333-333333333333';
const LESSON_2_ID = '44444444-4444-4444-8444-444444444444';

const requiredPermissions = (role: 'COURSE_OWNER' | 'TEACHER') => [
  { permission: 'COURSE_CONTENT_VIEW', courseRole: { name: role } },
  {
    permission: 'AI_USE_COURSE_GENERATION',
    courseRole: { name: role },
  },
];

const lessonDocument = (text: string) => ({
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text }],
    },
  ],
});

function sourceCourse(overrides: Record<string, unknown> = {}) {
  return {
    id: COURSE_ID,
    title: 'Biology',
    ownerId: USER_ID,
    permissions: requiredPermissions('COURSE_OWNER'),
    enrollments: [],
    modules: [
      {
        id: MODULE_ID,
        title: 'Cell biology',
        lessons: [{ id: LESSON_1_ID, title: 'Photosynthesis' }],
      },
    ],
    ...overrides,
  };
}

function generationCourse(overrides: Record<string, unknown> = {}) {
  return {
    ...sourceCourse(),
    modules: [
      {
        id: MODULE_ID,
        title: 'Cell biology',
        lessons: [
          {
            id: LESSON_1_ID,
            title: 'Photosynthesis',
            content: lessonDocument(
              'Plants convert light into chemical energy.'
            ),
          },
          {
            id: LESSON_2_ID,
            title: 'Cellular respiration',
            content: lessonDocument('Cells release energy from glucose.'),
          },
        ],
      },
    ],
    ...overrides,
  };
}

function generationInput(overrides: Record<string, unknown> = {}) {
  return {
    courseId: COURSE_ID,
    lessonIds: [LESSON_1_ID, LESSON_2_ID],
    questionCount: 2,
    additionalPrompt: 'Use practical examples.',
    topic: 'Energy in cells',
    difficulty: 'HARD' as const,
    ...overrides,
  };
}

function rawQuestion(index: number, correctOptionIndex = 1) {
  return {
    prompt: `Question ${index}`,
    hint: `Hint ${index}`,
    explanation: `Explanation ${index}`,
    timerSeconds: 45,
    maxPoints: 2_000,
    options: [`Distractor ${index}`, `Correct ${index}`, `Other ${index}`],
    correctOptionIndex,
  };
}

const mockGenerateText = generateText as unknown as ReturnType<typeof vi.fn>;
const mockCreateOpenRouter = createOpenRouter as unknown as ReturnType<
  typeof vi.fn
>;

describe('GameQuizAIService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
  });

  afterEach(() => {
    delete process.env.OPENROUTER_API_KEY;
  });

  describe('generateQuestions', () => {
    it('rejects users without an eligible course role and both permissions', async () => {
      mocks.courseFindFirst.mockResolvedValue(
        generationCourse({
          ownerId: 'another-user',
          enrollments: [],
        })
      );

      await expect(
        GameQuizAIService.generateQuestions(USER_ID, generationInput())
      ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
      expect(mockGenerateText).not.toHaveBeenCalled();
    });

    it('rejects all selected lessons when any lesson is outside the eligible course', async () => {
      mocks.courseFindFirst.mockResolvedValue(
        generationCourse({
          modules: [
            {
              id: MODULE_ID,
              title: 'Cell biology',
              lessons: [
                {
                  id: LESSON_1_ID,
                  title: 'Photosynthesis',
                  content: lessonDocument('Plants capture light.'),
                },
              ],
            },
          ],
        })
      );

      await expect(
        GameQuizAIService.generateQuestions(USER_ID, generationInput())
      ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
      expect(mockGenerateText).not.toHaveBeenCalled();
    });

    it('rejects a lesson without readable Tiptap text', async () => {
      mocks.courseFindFirst.mockResolvedValue(
        generationCourse({
          modules: [
            {
              id: MODULE_ID,
              title: 'Cell biology',
              lessons: [
                {
                  id: LESSON_1_ID,
                  title: 'Photosynthesis',
                  content: { type: 'doc', content: [{ type: 'paragraph' }] },
                },
              ],
            },
          ],
        })
      );

      await expect(
        GameQuizAIService.generateQuestions(
          USER_ID,
          generationInput({
            lessonIds: [LESSON_1_ID],
            questionCount: 1,
          })
        )
      ).rejects.toMatchObject({ code: 'INVALID_LESSON_CONTENT', status: 400 });
      expect(mockGenerateText).not.toHaveBeenCalled();
    });

    it('returns a configuration error before contacting AI when no server key exists', async () => {
      delete process.env.OPENROUTER_API_KEY;
      mocks.courseFindFirst.mockResolvedValue(generationCourse());

      await expect(
        GameQuizAIService.generateQuestions(USER_ID, generationInput())
      ).rejects.toMatchObject({
        code: 'AI_CONFIGURATION_ERROR',
        status: 503,
      });
      expect(mockGenerateText).not.toHaveBeenCalled();
    });

    it('generates the exact requested count with lesson context and complete question metadata', async () => {
      mocks.courseFindFirst.mockResolvedValue(generationCourse());
      mockGenerateText.mockResolvedValue({
        output: { questions: [rawQuestion(1), rawQuestion(2)] },
      });

      const result = await GameQuizAIService.generateQuestions(
        USER_ID,
        generationInput()
      );

      expect(result.questions).toHaveLength(2);
      expect(result.questions[0]).toEqual({
        prompt: 'Question 1',
        hint: 'Hint 1',
        explanation: 'Explanation 1',
        timerSeconds: 45,
        maxPoints: 2_000,
        options: [
          { text: 'Distractor 1', isCorrect: false },
          { text: 'Correct 1', isCorrect: true },
          { text: 'Other 1', isCorrect: false },
        ],
      });
      expect(mockCreateOpenRouter).toHaveBeenCalledWith({
        apiKey: 'test-openrouter-key',
      });
      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 60_000,
          prompt: expect.stringContaining('Generate exactly 2'),
        })
      );
      const prompt = mockGenerateText.mock.calls[0][0].prompt as string;
      expect(prompt).toContain('- Difficulty: HARD');
      expect(prompt).toContain('- Draft topic: Energy in cells');
      expect(prompt).toContain(
        '- Additional teacher guidance: Use practical examples.'
      );
      expect(prompt).toContain('## Module: Cell biology');
      expect(prompt).toContain('### Lesson: Photosynthesis');
      expect(prompt).toContain('Plants convert light into chemical energy.');
      expect(prompt).toContain('### Lesson: Cellular respiration');
      expect(prompt).toContain('Cells release energy from glucose.');
      expect(mocks.transaction).not.toHaveBeenCalled();
      expect(mocks.gameQuizCreate).not.toHaveBeenCalled();
      expect(mocks.gameQuizUpdate).not.toHaveBeenCalled();
      expect(mocks.questionCreate).not.toHaveBeenCalled();
    });

    it('rejects a provider result with the wrong number of questions', async () => {
      mocks.courseFindFirst.mockResolvedValue(generationCourse());
      mockGenerateText.mockResolvedValue({
        output: { questions: [rawQuestion(1)] },
      });

      await expect(
        GameQuizAIService.generateQuestions(USER_ID, generationInput())
      ).rejects.toMatchObject({ code: 'AI_GENERATION_FAILED', status: 502 });
    });

    it('maps invalid structured output to a provider failure', async () => {
      mocks.courseFindFirst.mockResolvedValue(generationCourse());
      mockGenerateText.mockResolvedValue({
        output: { questions: [rawQuestion(1, 3), rawQuestion(2)] },
      });

      await expect(
        GameQuizAIService.generateQuestions(USER_ID, generationInput())
      ).rejects.toMatchObject({ code: 'AI_GENERATION_FAILED', status: 502 });
    });

    it('maps timeout failures to a stable 504 error', async () => {
      mocks.courseFindFirst.mockResolvedValue(generationCourse());
      const timeout = new Error('The model request timed out');
      timeout.name = 'TimeoutError';
      mockGenerateText.mockRejectedValue(timeout);

      await expect(
        GameQuizAIService.generateQuestions(USER_ID, generationInput())
      ).rejects.toMatchObject({ code: 'AI_GENERATION_TIMEOUT', status: 504 });
    });

    it('maps other provider failures to a stable 502 error', async () => {
      mocks.courseFindFirst.mockResolvedValue(generationCourse());
      mockGenerateText.mockRejectedValue(new Error('Provider unavailable'));

      await expect(
        GameQuizAIService.generateQuestions(USER_ID, generationInput())
      ).rejects.toMatchObject({ code: 'AI_GENERATION_FAILED', status: 502 });
    });
  });
});
