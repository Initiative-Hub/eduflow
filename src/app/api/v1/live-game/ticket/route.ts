import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import { validationErrorResponse } from '@/lib/game-quiz/http';
import {
  issueLiveGameAvatarAccessToken,
  issueLiveGameTicket,
} from '@/lib/game-quiz/live-game-security';
import { liveGameTicketRequestSchema } from '@/lib/game-quiz/runtime-protocol';
import { prisma } from '@/lib/prisma';

/**
 * @swagger
 * /api/v1/live-game/ticket:
 *   post:
 *     tags: [Game Sessions]
 *     summary: Exchange a Better Auth session for a short-lived PartyKit ticket
 *     security: [{ SessionCookie: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - { type: object, required: [audience, sessionId] }
 *               - { type: object, required: [audience, joinCode] }
 *     responses:
 *       200: { description: Room-bound connection ticket }
 *       400: { description: Invalid request }
 *       401: { description: Unauthenticated }
 *       403: { description: Session access denied }
 *       404: { description: Active session not found }
 */
export const POST = withAuth(async (request, session) => {
  const parsed = liveGameTicketRequestSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return validationErrorResponse(
      parsed.error,
      'Invalid live-game ticket request.'
    );
  }

  const gameSession =
    parsed.data.audience === 'HOST'
      ? await prisma.gameSession.findUnique({
          where: { id: parsed.data.sessionId },
          select: { hostId: true, id: true, runtimeStatus: true },
        })
      : parsed.data.expectedSessionId
        ? await prisma.gameSession.findFirst({
            where: {
              id: parsed.data.expectedSessionId,
              joinCode: parsed.data.joinCode,
              OR: [
                { runtimeStatus: { in: ['ACTIVE', 'FINALIZING'] } },
                {
                  runtimeStatus: 'FINALIZED',
                  participants: { some: { userId: session.user.id } },
                },
              ],
            },
            select: { hostId: true, id: true, runtimeStatus: true },
          })
        : await prisma.gameSession.findFirst({
            where: {
              joinCode: parsed.data.joinCode,
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
    parsed.data.audience === 'PARTICIPANT' &&
    parsed.data.expectedSessionId &&
    parsed.data.expectedSessionId !== gameSession.id
  ) {
    return NextResponse.json(
      {
        code: 'SESSION_MISMATCH',
        message: 'The join code now belongs to another Game Session.',
      },
      { status: 409 }
    );
  }
  if (
    parsed.data.audience === 'HOST' &&
    gameSession.hostId !== session.user.id &&
    session.user.role !== 'ADMIN'
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

  const secret = process.env.LIVE_GAME_TICKET_SECRET;
  if (!secret) throw new Error('LIVE_GAME_TICKET_SECRET is required.');

  const [ticket, avatarAccess] = await Promise.all([
    issueLiveGameTicket({
      audience: parsed.data.audience,
      role: session.user.role,
      secret,
      sessionId: gameSession.id,
      userId: session.user.id,
    }),
    issueLiveGameAvatarAccessToken({
      audience: parsed.data.audience,
      secret,
      sessionId: gameSession.id,
      userId: session.user.id,
    }),
  ]);

  return NextResponse.json({
    roomId: gameSession.id,
    ...ticket,
    avatarAccessExpiresAt: avatarAccess.expiresAt,
    avatarAccessToken: avatarAccess.token,
    profile: {
      displayName: session.user.name,
      image: session.user.image ?? null,
    },
  });
});
