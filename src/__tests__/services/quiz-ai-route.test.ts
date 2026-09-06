import type { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuizService } from '@/services/QuizService';

vi.mock('@/lib/api/middlewares', () => ({
  withRoles: (_allowedRoles: string[], handler: any) => {
    return (req: Request, ...args: any[]) => {
      const sessionData = args[0];
      return handler(req, sessionData, ...args.slice(1));
    };
  },
  withAuth: (handler: any) => {
    return (req: Request, ...args: any[]) => {
      const sessionData = args[0];
      return handler(req, sessionData, ...args.slice(1));
    };
  },
}));

vi.mock('@/services/QuizService', () => ({
  QuizService: {
    generateDraft: vi.fn(),
    generateAndSave: vi.fn(),
  },
}));

function jsonRequest(body: unknown): NextRequest {
  return {
    json: async () => body,
  } as NextRequest;
}

const adminSession = {
  session: { id: 'session-1' },
  user: {
    id: 'admin-1',
    role: 'ADMIN',
  },
};

describe('AI quiz route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows admins to generate and save quiz questions', async () => {
    vi.mocked(QuizService.generateAndSave).mockResolvedValue({
      id: '66eb6bbd-64b3-47ed-ae4a-07b24b90a711',
      questions: [{ type: 'multiple_choice', prompt: 'Generated question' }],
    } as never);
    const { POST } = await import('@/app/api/v1/ai/quiz/route');

    const response = await POST(
      jsonRequest({
        quizId: '66eb6bbd-64b3-47ed-ae4a-07b24b90a711',
      }),
      adminSession
    );

    expect(response.status).toBe(201);
    expect(QuizService.generateAndSave).toHaveBeenCalledWith(
      '66eb6bbd-64b3-47ed-ae4a-07b24b90a711',
      'admin-1',
      {
        apiKey: undefined,
        context: undefined,
        model: undefined,
        topic: undefined,
      }
    );
  });

  it('generates draft questions without creating a quiz', async () => {
    vi.mocked(QuizService.generateDraft).mockResolvedValue({
      questions: [{ type: 'multiple_choice', prompt: 'Draft question' }],
    } as never);
    const { POST } = await import('@/app/api/v1/ai/quiz/route');

    const response = await POST(
      jsonRequest({
        courseId: '66eb6bbd-64b3-47ed-ae4a-07b24b90a711',
        lessonIds: ['b4ee6d5a-37ba-447a-bc7d-87cd8161c7b8'],
        questionCounts: { MULTIPLE_CHOICE: 2 },
        context: 'Focus on practical examples',
      }),
      adminSession
    );

    expect(response.status).toBe(201);
    expect(QuizService.generateDraft).toHaveBeenCalledWith(
      '66eb6bbd-64b3-47ed-ae4a-07b24b90a711',
      'admin-1',
      {
        lessonIds: ['b4ee6d5a-37ba-447a-bc7d-87cd8161c7b8'],
        questionCounts: { MULTIPLE_CHOICE: 2 },
        context: 'Focus on practical examples',
        apiKey: undefined,
        model: undefined,
        topic: undefined,
      }
    );
  });
});
