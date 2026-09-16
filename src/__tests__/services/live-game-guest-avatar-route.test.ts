import { beforeEach, describe, expect, it, vi } from 'vitest';
import { issueLiveGameAvatarAccessToken } from '@/lib/game-quiz/live-game-security';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  signAvatar: vi.fn(),
}));

vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: mocks.getSession } },
}));
vi.mock('@/lib/storage/avatar', () => ({
  createAvatarReadSignedUrl: mocks.signAvatar,
  isAvatarObjectKey: (value: string) =>
    value.startsWith('users/') && value.includes('/avatars/'),
}));

const secret = 'ticket-secret-that-is-at-least-32-characters-long';
const roomId = '00000000-0000-4000-8000-000000000001';
const subject = '00000000-0000-4000-8000-000000000002';
const avatarKey = `users/${subject}/avatars/00000000-0000-4000-8000-000000000003.png`;

function request(token: string, sessionId = roomId) {
  return new Request('https://example.com/api/v1/live-game/avatar-urls', {
    body: JSON.stringify({ sessionId, objectKeys: [avatarKey] }),
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });
}

describe('guest live-game avatar URLs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.LIVE_GAME_TICKET_SECRET = secret;
    mocks.getSession.mockResolvedValue(null);
    mocks.signAvatar.mockResolvedValue('https://example.com/signed-avatar');
  });

  it('lets a guest token resolve room avatars without a user session', async () => {
    const access = await issueLiveGameAvatarAccessToken({
      audience: 'PARTICIPANT',
      identityKind: 'GUEST',
      secret,
      sessionId: roomId,
      userId: subject,
    });
    const { POST } = await import('@/app/api/v1/live-game/avatar-urls/route');
    const response = await POST(request(access.token));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: [
        {
          objectKey: avatarKey,
          signedUrl: 'https://example.com/signed-avatar',
        },
      ],
    });
    const otherRoom = await POST(request(access.token, subject));
    expect(otherRoom.status).toBe(403);
  });

  it('still requires a user session for user avatar tokens', async () => {
    const access = await issueLiveGameAvatarAccessToken({
      audience: 'PARTICIPANT',
      secret,
      sessionId: roomId,
      userId: subject,
    });
    const { POST } = await import('@/app/api/v1/live-game/avatar-urls/route');
    expect((await POST(request(access.token))).status).toBe(403);
    expect((await POST(request('invalid'))).status).toBe(401);
  });
});
