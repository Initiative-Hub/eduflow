import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  verifyLiveGameGuestGrant,
  verifyLiveGameTicket,
} from '@/lib/game-quiz/live-game-security';

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: mocks.getSession } },
}));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    gameSession: { findFirst: mocks.findFirst, findUnique: mocks.findUnique },
  },
}));

const secret = 'ticket-secret-that-is-at-least-32-characters-long';
const roomId = '00000000-0000-4000-8000-000000000001';
const userId = '00000000-0000-4000-8000-000000000002';
const activeRoom = { hostId: userId, id: roomId, runtimeStatus: 'ACTIVE' };

function request(body: unknown) {
  return new Request('https://example.com/api/v1/live-game/ticket', {
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });
}

describe('live-game ticket route', () => {
  const previousSecret = process.env.LIVE_GAME_TICKET_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.LIVE_GAME_TICKET_SECRET = secret;
    mocks.findFirst.mockResolvedValue(activeRoom);
    mocks.findUnique.mockResolvedValue(activeRoom);
    mocks.getSession.mockResolvedValue(null);
  });

  afterEach(() => {
    if (previousSecret === undefined) {
      delete process.env.LIVE_GAME_TICKET_SECRET;
    } else {
      process.env.LIVE_GAME_TICKET_SECRET = previousSecret;
    }
  });

  it('validates guest names before looking up a room', async () => {
    const { POST } = await import('@/app/api/v1/live-game/ticket/route');
    const missing = await POST(
      request({ audience: 'PARTICIPANT', joinCode: '123456' })
    );
    expect(missing.status).toBe(400);
    const blank = await POST(
      request({
        audience: 'PARTICIPANT',
        joinCode: '123456',
        displayName: '  ',
      })
    );
    expect(blank.status).toBe(400);
    const tooLong = await POST(
      request({
        audience: 'PARTICIPANT',
        joinCode: '123456',
        displayName: 'a'.repeat(81),
      })
    );
    expect(tooLong.status).toBe(400);
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });

  it('issues a signed room grant and guest ticket with the trimmed name', async () => {
    const { POST } = await import('@/app/api/v1/live-game/ticket/route');
    const response = await POST(
      request({
        audience: 'PARTICIPANT',
        joinCode: '123456',
        displayName: ' Taylor ',
      })
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    const body = await response.json();
    expect(body.profile).toEqual({ displayName: 'Taylor', image: null });
    const grant = await verifyLiveGameGuestGrant(body.guestGrant, secret);
    const ticket = await verifyLiveGameTicket(body.token, secret);
    expect(grant).toMatchObject({ displayName: 'Taylor', sessionId: roomId });
    expect(ticket).toMatchObject({
      audience: 'PARTICIPANT',
      guestDisplayName: 'Taylor',
      identityKind: 'GUEST',
      role: null,
      sessionId: roomId,
      sub: grant.sub,
    });
  });

  it('renews the same guest even after sign-in and keeps the signed name', async () => {
    const { POST } = await import('@/app/api/v1/live-game/ticket/route');
    const joined = await POST(
      request({
        audience: 'PARTICIPANT',
        joinCode: '123456',
        displayName: 'Taylor',
      })
    );
    const first = await joined.json();
    const guest = await verifyLiveGameGuestGrant(first.guestGrant, secret);
    mocks.getSession.mockResolvedValue({
      user: {
        id: userId,
        image: 'user-avatar',
        name: 'Account Name',
        role: 'STUDENT',
      },
    });
    mocks.findFirst.mockResolvedValue({
      ...activeRoom,
      runtimeStatus: 'FINALIZED',
    });
    const renewed = await POST(
      request({
        audience: 'PARTICIPANT',
        displayName: 'Changed Name',
        expectedSessionId: roomId,
        guestGrant: first.guestGrant,
        joinCode: '123456',
      })
    );
    expect(renewed.status).toBe(200);
    const body = await renewed.json();
    expect(body.guestGrant).toBeUndefined();
    expect(body.profile).toEqual({ displayName: 'Taylor', image: null });
    expect(await verifyLiveGameTicket(body.token, secret)).toMatchObject({
      identityKind: 'GUEST',
      sub: guest.sub,
    });
    expect(
      mocks.findFirst.mock.lastCall?.[0].where.OR[1].participants.some
    ).toEqual({
      guestId: guest.sub,
    });
  });

  it('rejects invalid or cross-room grants before database access', async () => {
    const { POST } = await import('@/app/api/v1/live-game/ticket/route');
    const invalid = await POST(
      request({
        audience: 'PARTICIPANT',
        expectedSessionId: roomId,
        guestGrant: 'invalid',
        joinCode: '123456',
      })
    );
    expect(invalid.status).toBe(401);
    expect(mocks.findFirst).not.toHaveBeenCalled();
    const joined = await POST(
      request({
        audience: 'PARTICIPANT',
        displayName: 'Taylor',
        joinCode: '123456',
      })
    );
    const grant = (await joined.json()).guestGrant;
    mocks.findFirst.mockClear();
    const otherRoom = await POST(
      request({
        audience: 'PARTICIPANT',
        expectedSessionId: userId,
        guestGrant: grant,
        joinCode: '123456',
      })
    );
    expect(otherRoom.status).toBe(403);
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });

  it('keeps hosting authenticated and signed-in joins free of a name prompt', async () => {
    const { POST } = await import('@/app/api/v1/live-game/ticket/route');
    const unauthorized = await POST(
      request({ audience: 'HOST', sessionId: roomId })
    );
    expect(unauthorized.status).toBe(401);
    mocks.getSession.mockResolvedValue({
      user: { id: userId, image: null, name: 'Sam', role: 'TEACHER' },
    });
    const signedIn = await POST(
      request({ audience: 'PARTICIPANT', joinCode: '123456' })
    );
    expect(signedIn.status).toBe(200);
    const playerBody = await signedIn.json();
    expect(playerBody.guestGrant).toBeUndefined();
    expect(await verifyLiveGameTicket(playerBody.token, secret)).toMatchObject({
      identityKind: 'USER',
      sub: userId,
    });
    const host = await POST(request({ audience: 'HOST', sessionId: roomId }));
    expect(host.status).toBe(200);
    mocks.findUnique.mockResolvedValue({ ...activeRoom, hostId: roomId });
    const forbidden = await POST(
      request({ audience: 'HOST', sessionId: roomId })
    );
    expect(forbidden.status).toBe(403);
  });
});
