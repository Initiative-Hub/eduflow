import type { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuizService } from '@/services/QuizService';

vi.mock('@/lib/api/middlewares', () => ({
  withAuth: (handler: any) => {
    return (req: Request, ...args: any[]) => {
      const sessionData = args[0];
      return handler(req, sessionData, ...args.slice(1));
    };
  },
}));

vi.mock('@/services/QuizService', () => ({
  QuizService: {
    updateDetails: vi.fn(),
  },
}));

function jsonRequest(body: unknown): NextRequest {
  return {
    json: async () => body,
  } as NextRequest;
}

const teacherSession = {
  session: { id: 'session-1' },
  user: {
    id: 'teacher-1',
    role: 'TEACHER',
  },
};

describe('quiz route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates editable quiz details', async () => {
    vi.mocked(QuizService.updateDetails).mockResolvedValue({
      id: '66eb6bbd-64b3-47ed-ae4a-07b24b90a711',
      title: 'Updated quiz',
    } as never);
    const { PATCH } = await import('@/app/api/v1/quizzes/[quizId]/route');

    const response = await PATCH(
      jsonRequest({
        title: 'Updated quiz',
        description: 'Review chapter one',
        lessonIds: ['b4ee6d5a-37ba-447a-bc7d-87cd8161c7b8'],
        deliveryMode: 'POST_QUIZ_REVIEW',
      }),
      teacherSession,
      {
        params: Promise.resolve({
          quizId: '66eb6bbd-64b3-47ed-ae4a-07b24b90a711',
        }),
      }
    );

    expect(response.status).toBe(200);
    expect(QuizService.updateDetails).toHaveBeenCalledWith(
      '66eb6bbd-64b3-47ed-ae4a-07b24b90a711',
      'teacher-1',
      {
        title: 'Updated quiz',
        description: 'Review chapter one',
        lessonIds: ['b4ee6d5a-37ba-447a-bc7d-87cd8161c7b8'],
        deliveryMode: 'POST_QUIZ_REVIEW',
      }
    );
  });
});
