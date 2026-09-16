import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  leaveGameSession: vi.fn(),
}));

vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: mocks.getSession } },
}));
vi.mock('@/services/GameQuizSessionService', () => ({
  leaveGameSession: mocks.leaveGameSession,
}));

const gameQuizId = '00000000-0000-4000-8000-000000000001';
const sessionId = '00000000-0000-4000-8000-000000000002';

function context(params = { gameQuizId, sessionId }) {
  return { params: Promise.resolve(params) };
}

describe('live-game leave route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({
      user: { id: 'host-1', name: 'Sam', role: 'TEACHER' },
    });
    mocks.leaveGameSession.mockResolvedValue({ ended: true });
  });

  it('validates both route parameters before leaving', async () => {
    const { POST } = await import(
      '@/app/api/v1/game-quizzes/[gameQuizId]/sessions/[sessionId]/leave/route'
    );

    const response = await POST(
      new Request(
        'https://example.com/api/v1/game-quizzes/bad/sessions/bad/leave',
        {
          method: 'POST',
        }
      ),
      context({ gameQuizId: 'bad', sessionId })
    );

    expect(response.status).toBe(400);
    expect(mocks.leaveGameSession).not.toHaveBeenCalled();
  });

  it('delegates an authenticated host leave to the session service', async () => {
    const { POST } = await import(
      '@/app/api/v1/game-quizzes/[gameQuizId]/sessions/[sessionId]/leave/route'
    );

    const response = await POST(
      new Request(
        `https://example.com/api/v1/game-quizzes/${gameQuizId}/sessions/${sessionId}/leave`,
        { method: 'POST' }
      ),
      context()
    );

    expect(response.status).toBe(200);
    expect(mocks.leaveGameSession).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'host-1', role: 'TEACHER' }),
      gameQuizId,
      sessionId
    );
    await expect(response.json()).resolves.toEqual({ ended: true });
  });
});
