import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { validationErrorResponse } from '@/lib/game-quiz/http';
import {
  issueLiveGameAvatarAccessToken,
  issueLiveGameGuestGrant,
  issueLiveGameTicket,
  verifyLiveGameGuestGrant,
} from '@/lib/game-quiz/live-game-security';
import { liveGameTicketRequestSchema } from '@/lib/game-quiz/runtime-protocol';
import { prisma } from '@/lib/prisma';

/**
 * @swagger
 * /api/v1/live-game/ticket:
 *   post:
 *     tags: [Game Sessions]
 *     summary: Exchange a user session or room-bound guest grant for a PartyKit ticket
 *     security: [{ SessionCookie: [] }, {}]
 *     description: Hosts require a session cookie. Guests provide a name on first join or a guestGrant when reconnecting.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - { type: object, required: [audience, sessionId] }
 *               - { type: object, required: [audience, joinCode, displayName] }
 *               - { type: object, required: [audience, joinCode, expectedSessionId, guestGrant] }
 *     responses:
 *       200: { description: Room-bound connection ticket and an initial guest grant when joining as a guest }
 *       400: { description: Invalid request or missing guest name }
 *       401: { description: Missing user session or invalid guest grant }
 *       403: { description: Host access denied or grant bound to another room }
 *       404: { description: Active session not found }
 *       409: { description: Room not ready }
 */
export async function POST(request: Request) {
  const parsed = liveGameTicketRequestSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return validationErrorResponse(
      parsed.error,
      'Invalid live-game ticket request.'
    );
  }

  const secret = process.env.LIVE_GAME_TICKET_SECRET;
  if (!secret) throw new Error('LIVE_GAME_TICKET_SECRET is required.');
  const session = await auth.api.getSession({ headers: await headers() });
  const input = parsed.data;

  let guestGrantClaims = null;
  if (input.audience === 'PARTICIPANT' && input.guestGrant) {
    try {
      guestGrantClaims = await verifyLiveGameGuestGrant(
        input.guestGrant,
        secret
      );
    } catch {
      return NextResponse.json(
        { code: 'INVALID_GUEST_GRANT', message: 'Join the game again.' },
        { status: 401 }
      );
    }
    if (
      !input.expectedSessionId ||
      input.expectedSessionId !== guestGrantClaims.sessionId
    ) {
      return NextResponse.json(
        { code: 'GUEST_GRANT_ROOM_MISMATCH', message: 'Join the game again.' },
        { status: 403 }
      );
    }
  }

  if (input.audience === 'HOST' && !session) {
    return NextResponse.json(
      { code: 'UNAUTHORIZED', message: 'Sign in to host this game.' },
      { status: 401 }
    );
  }
  if (
    input.audience === 'PARTICIPANT' &&
    !guestGrantClaims &&
    !session &&
    (!input.displayName || input.expectedSessionId)
  ) {
    return NextResponse.json(
      { code: 'GUEST_NAME_REQUIRED', message: 'Enter your name to join.' },
      { status: 400 }
    );
  }

  const identityKind =
    guestGrantClaims || (!session && input.audience === 'PARTICIPANT')
      ? 'GUEST'
      : 'USER';
  const identityId =
    guestGrantClaims?.sub ?? session?.user.id ?? crypto.randomUUID();
  const participantFilter =
    identityKind === 'GUEST' ? { guestId: identityId } : { userId: identityId };

  const gameSession =
    input.audience === 'HOST'
      ? await prisma.gameSession.findUnique({
          where: { id: input.sessionId },
          select: { hostId: true, id: true, runtimeStatus: true },
        })
      : input.expectedSessionId
        ? await prisma.gameSession.findFirst({
            where: {
              id: input.expectedSessionId,
              joinCode: input.joinCode,
              OR: [
                { runtimeStatus: { in: ['ACTIVE', 'FINALIZING'] } },
                {
                  runtimeStatus: 'FINALIZED',
                  participants: { some: participantFilter },
                },
              ],
            },
            select: { hostId: true, id: true, runtimeStatus: true },
          })
        : await prisma.gameSession.findFirst({
            where: {
              joinCode: input.joinCode,
              joinCodeReleasedAt: null,
              runtimeStatus: { in: ['ACTIVE', 'FINALIZING'] },
            },
            select: { hostId: true, id: true, runtimeStatus: true },
          });

  if (!gameSession) {
    return NextResponse.json(
      {
        code: 'GAME_SESSION_NOT_FOUND',
        message: 'No active Game Session was found.',
      },
      { status: 404 }
    );
  }
  if (
    input.audience === 'HOST' &&
    gameSession.hostId !== session!.user.id &&
    session!.user.role !== 'ADMIN'
  ) {
    return NextResponse.json(
      { code: 'FORBIDDEN', message: 'Only the host can connect to this room.' },
      { status: 403 }
    );
  }
  if (
    gameSession.runtimeStatus !== 'ACTIVE' &&
    gameSession.runtimeStatus !== 'FINALIZING' &&
    gameSession.runtimeStatus !== 'FINALIZED'
  ) {
    return NextResponse.json(
      { code: 'ROOM_NOT_READY', message: 'The live-game room is not active.' },
      { status: 409 }
    );
  }

  const displayName =
    guestGrantClaims?.displayName ??
    (identityKind === 'GUEST' && input.audience === 'PARTICIPANT'
      ? input.displayName!
      : session!.user.name);
  const guestGrant =
    identityKind === 'GUEST' && !guestGrantClaims
      ? await issueLiveGameGuestGrant({
          displayName,
          guestId: identityId,
          secret,
          sessionId: gameSession.id,
        })
      : null;
  const [ticket, avatarAccess] = await Promise.all([
    issueLiveGameTicket({
      audience: input.audience,
      guestDisplayName: identityKind === 'GUEST' ? displayName : undefined,
      identityKind,
      role: identityKind === 'GUEST' ? null : session!.user.role,
      secret,
      sessionId: gameSession.id,
      userId: identityId,
    }),
    issueLiveGameAvatarAccessToken({
      audience: input.audience,
      identityKind,
      secret,
      sessionId: gameSession.id,
      userId: identityId,
    }),
  ]);

  return NextResponse.json({
    roomId: gameSession.id,
    ...ticket,
    ...(guestGrant ? { guestGrant: guestGrant.token } : {}),
    avatarAccessExpiresAt: avatarAccess.expiresAt,
    avatarAccessToken: avatarAccess.token,
    profile: {
      displayName,
      image: identityKind === 'GUEST' ? null : (session!.user.image ?? null),
    },
  });
}
