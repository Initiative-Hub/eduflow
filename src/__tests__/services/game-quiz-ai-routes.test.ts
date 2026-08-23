import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameQuizAIServiceError } from '@/services/GameQuizAIService';

const mocks = vi.hoisted(() => ({
  generateQuestions: vi.fn(),
  listSources: vi.fn(),
}));

vi.mock('@/lib/api/middlewares', () => ({
  withAuth:
    (handler: any) =>
    (request: Request, ...args: any[]) =>
      handler(request, args[0]),
}));

vi.mock('@/services/GameQuizAIService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/GameQuizAIService')>()),
  GameQuizAIService: {
    generateQuestions: mocks.generateQuestions,
    listSources: mocks.listSources,
  },
}));

const COURSE_ID = '11111111-1111-4111-8111-111111111111';
const LESSON_ID = '22222222-2222-4222-8222-222222222222';
const sessionData = {
  session: { id: 'session-1' },
  user: { id: 'user-1', role: 'TEACHER' },
};

function jsonRequest(body: unknown): Request {
  return new Request('https://example.com/api/v1/ai/game-quiz/questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function validRequest(overrides: Record<string, unknown> = {}) {
  return {
    courseId: COURSE_ID,
    lessonIds: [LESSON_ID],
    questionCount: 3,
    additionalPrompt: '  Focus on applications.  ',
    topic: '  Photosynthesis  ',
    difficulty: 'MEDIUM',
    ...overrides,
  };
}

describe('Game Quiz AI routes', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('returns eligible sources without allowing browser caching', async () => {
    const sources = {
      courses: [
        {
          id: COURSE_ID,
          title: 'Biology',
          modules: [
            {
              id: '33333333-3333-4333-8333-333333333333',
              title: 'Cells',
              lessons: [{ id: LESSON_ID, title: 'Photosynthesis' }],
            },
          ],
        },
      ],
    };
    mocks.listSources.mockResolvedValue(sources);
    const { GET } = await import('@/app/api/v1/ai/game-quiz/sources/route');

    const response = await GET(
      new Request('https://example.com/api/v1/ai/game-quiz/sources'),
      sessionData
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    await expect(response.json()).resolves.toEqual(sources);
    expect(mocks.listSources).toHaveBeenCalledWith('user-1');
  });

  it('returns a stable source-discovery failure without leaking internals', async () => {
    mocks.listSources.mockRejectedValue(new Error('database host secret'));
    const { GET } = await import('@/app/api/v1/ai/game-quiz/sources/route');

    const response = await GET(
      new Request('https://example.com/api/v1/ai/game-quiz/sources'),
      sessionData
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      code: 'INTERNAL_ERROR',
      message: 'Failed to load AI Game Quiz sources',
    });
  });

  it('validates and forwards a trimmed generation request for the session user', async () => {
    const generated = {
      questions: [
        {
          prompt: 'What captures light energy?',
          hint: 'It contains chlorophyll.',
          explanation: 'Chloroplasts capture light energy.',
          timerSeconds: 30,
          maxPoints: 1_000,
          options: [
            { text: 'Chloroplast', isCorrect: true },
            { text: 'Nucleus', isCorrect: false },
          ],
        },
      ],
    };
    mocks.generateQuestions.mockResolvedValue(generated);
    const { POST, maxDuration } = await import(
      '@/app/api/v1/ai/game-quiz/questions/route'
    );

    const response = await POST(jsonRequest(validRequest()), sessionData);

    expect(maxDuration).toBe(90);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(generated);
    expect(mocks.generateQuestions).toHaveBeenCalledWith('user-1', {
      ...validRequest(),
      additionalPrompt: 'Focus on applications.',
      topic: 'Photosynthesis',
    });
  });

  it('rejects malformed JSON before calling the service', async () => {
    const { POST } = await import('@/app/api/v1/ai/game-quiz/questions/route');
    const request = new Request(
      'https://example.com/api/v1/ai/game-quiz/questions',
      { method: 'POST', body: '{invalid' }
    );

    const response = await POST(request, sessionData);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
    expect(mocks.generateQuestions).not.toHaveBeenCalled();
  });

  it.each([
    ['an invalid course ID', { courseId: 'course-1' }],
    ['no lessons', { lessonIds: [] }],
    ['duplicate lessons', { lessonIds: [LESSON_ID, LESSON_ID] }],
    ['more than twenty lessons', { lessonIds: Array(21).fill(LESSON_ID) }],
    ['zero questions', { questionCount: 0 }],
    ['more than twenty questions', { questionCount: 21 }],
    ['an oversized prompt', { additionalPrompt: 'x'.repeat(501) }],
    ['an unsupported difficulty', { difficulty: 'EXPERT' }],
  ])('rejects %s before calling the service', async (_name, override) => {
    const { POST } = await import('@/app/api/v1/ai/game-quiz/questions/route');

    const response = await POST(
      jsonRequest(validRequest(override)),
      sessionData
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
    expect(mocks.generateQuestions).not.toHaveBeenCalled();
  });

  it.each([
    ['INVALID_LESSON_CONTENT', 400],
    ['FORBIDDEN', 403],
    ['AI_GENERATION_FAILED', 502],
    ['AI_CONFIGURATION_ERROR', 503],
    ['AI_GENERATION_TIMEOUT', 504],
  ] as const)('maps %s service failures to HTTP %i', async (code, status) => {
    mocks.generateQuestions.mockRejectedValue(
      new GameQuizAIServiceError(code, 'Stable message', status)
    );
    const { POST } = await import('@/app/api/v1/ai/game-quiz/questions/route');

    const response = await POST(jsonRequest(validRequest()), sessionData);

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({
      code,
      message: 'Stable message',
    });
  });

  it('maps unexpected generation failures to a stable 502 response', async () => {
    mocks.generateQuestions.mockRejectedValue(
      new Error('upstream body with sensitive detail')
    );
    const { POST } = await import('@/app/api/v1/ai/game-quiz/questions/route');

    const response = await POST(jsonRequest(validRequest()), sessionData);

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      code: 'AI_GENERATION_FAILED',
      message: 'AI could not generate valid quiz questions',
    });
  });
});
