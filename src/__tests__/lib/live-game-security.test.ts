import { describe, expect, it } from 'vitest';
import {
  issueLiveGameAvatarAccessToken,
  issueLiveGameTicket,
  signLiveGameServiceRequest,
  verifyLiveGameAvatarAccessToken,
  verifyLiveGameServiceRequest,
  verifyLiveGameTicket,
} from '@/lib/game-quiz/live-game-security';

const ticketSecret = 'ticket-secret-that-is-at-least-32-characters-long';
const serviceSecret = 'service-secret-that-is-at-least-32-characters-long';
const sessionId = '00000000-0000-4000-8000-000000000001';
const userId = '00000000-0000-4000-8000-000000000002';

describe('live-game authentication', () => {
  it('issues room-bound audience claims without Better Auth credentials', async () => {
    const ticket = await issueLiveGameTicket({
      audience: 'PARTICIPANT',
      role: 'STUDENT',
      secret: ticketSecret,
      sessionId,
      userId,
    });
    const claims = await verifyLiveGameTicket(ticket.token, ticketSecret);
    expect(claims).toMatchObject({
      audience: 'PARTICIPANT',
      role: 'STUDENT',
      sessionId,
      sub: userId,
    });
    await expect(
      verifyLiveGameTicket(ticket.token, `${ticketSecret}-wrong`)
    ).rejects.toThrow();
  });

  it('binds service signatures to direction, path, and raw body', async () => {
    const body = JSON.stringify({ sessionId, type: 'BEGIN' });
    const pathname = '/api/v1/internal/live-game/finalize';
    const headers = await signLiveGameServiceRequest({
      body,
      direction: 'partykit-to-next',
      method: 'POST',
      pathname,
      secret: serviceSecret,
    });
    const verify = (
      overrides: Partial<
        Parameters<typeof verifyLiveGameServiceRequest>[0]
      > = {}
    ) =>
      verifyLiveGameServiceRequest({
        body,
        direction: 'partykit-to-next',
        method: 'POST',
        pathname,
        requestId: headers['X-Eduflow-Request-Id'],
        secret: serviceSecret,
        signature: headers['X-Eduflow-Signature'],
        timestamp: headers['X-Eduflow-Timestamp'],
        ...overrides,
      });

    await expect(verify()).resolves.toBe(true);
    await expect(verify({ body: `${body} ` })).resolves.toBe(false);
    await expect(verify({ direction: 'next-to-partykit' })).resolves.toBe(
      false
    );
    await expect(verify({ pathname: '/different' })).resolves.toBe(false);
    await expect(
      verify({ timestamp: String(Date.now() - 120_000) })
    ).resolves.toBe(false);
  });

  it('issues avatar access tokens with a distinct, session-bound audience', async () => {
    const access = await issueLiveGameAvatarAccessToken({
      audience: 'PARTICIPANT',
      secret: ticketSecret,
      sessionId,
      userId,
    });
    const claims = await verifyLiveGameAvatarAccessToken(
      access.token,
      ticketSecret
    );
    expect(claims).toMatchObject({
      audience: 'PARTICIPANT',
      sessionId,
      sub: userId,
    });
    await expect(
      verifyLiveGameTicket(access.token, ticketSecret)
    ).rejects.toThrow();
  });
});
