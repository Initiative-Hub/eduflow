import { describe, expect, it, vi } from 'vitest';

const { requireGameSession, requireGameSessionHost } = vi.hoisted(() => ({
  requireGameSession: vi.fn(),
  requireGameSessionHost: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/game-quiz/shared', () => ({
  requireGameSession,
  requireGameSessionHost,
}));

import {
  resolveLiveGameSession,
  resolveRequestLiveGameSession,
} from '@/lib/game-quiz/http';

const sessionId = '00000000-0000-4000-8000-000000000001';
const gameQuizId = '00000000-0000-4000-8000-000000000010';
const actor = { name: 'Sam', role: 'STUDENT' as const, userId: 'user-1' };

function gameSession(
  participants = [{ id: 'participant-1', userId: 'user-1' }]
) {
  return { gameQuizId, hostId: 'host-1', id: sessionId, participants };
}

function requestWithSessionId(value: string | null) {
  const headers = new Headers();
  if (value) headers.set('X-Live-Game-Session', value);
  return new Request('https://eduflow.test/api/v1/live-game', { headers });
}

const authSession = {
  user: { id: 'user-1', name: 'Sam', role: 'STUDENT' },
} as never;

describe('live game session resolver', () => {
  it('rejects a missing or malformed live-session header before reading data', async () => {
    await expect(
      resolveRequestLiveGameSession({
        audience: 'PARTICIPANT',
        request: requestWithSessionId(null),
        session: authSession,
      })
    ).rejects.toMatchObject({ code: 'GAME_SESSION_REQUIRED', status: 400 });

    await expect(
      resolveRequestLiveGameSession({
        audience: 'PARTICIPANT',
        request: requestWithSessionId('not-a-uuid'),
        session: authSession,
      })
    ).rejects.toMatchObject({ code: 'GAME_SESSION_REQUIRED', status: 400 });

    expect(requireGameSession).not.toHaveBeenCalled();
  });

  it('authorizes a participant only through their row in the selected session', async () => {
    requireGameSession.mockResolvedValueOnce(gameSession());

    await expect(
      resolveLiveGameSession({
        actor,
        audience: 'PARTICIPANT',
        expectedGameQuizId: gameQuizId,
        sessionId,
      })
    ).resolves.toEqual({ participantId: 'participant-1', sessionId });

    requireGameSession.mockResolvedValueOnce(gameSession([]));
    await expect(
      resolveLiveGameSession({
        actor,
        audience: 'PARTICIPANT',
        sessionId,
      })
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
  });

  it('rejects a session selected under a different quiz and delegates host authorization', async () => {
    requireGameSession.mockResolvedValueOnce(gameSession());
    await expect(
      resolveLiveGameSession({
        actor,
        audience: 'HOST',
        expectedGameQuizId: '00000000-0000-4000-8000-000000000099',
        sessionId,
      })
    ).rejects.toMatchObject({ code: 'GAME_SESSION_NOT_FOUND', status: 404 });

    requireGameSession.mockResolvedValueOnce(gameSession());
    await resolveLiveGameSession({ actor, audience: 'HOST', sessionId });
    expect(requireGameSessionHost).toHaveBeenCalledWith(actor, gameSession());
  });
});
