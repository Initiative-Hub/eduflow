import { handle } from '@upstash/realtime';
import { auth } from '@/lib/auth';
import { parseGameQuizRealtimeChannel } from '@/lib/game-quiz/realtime-events';
import { prisma } from '@/lib/prisma';
import { getGameQuizRealtime } from '@/lib/realtime/game-quiz';

export const dynamic = 'force-dynamic';

type GameSessionAccessRow = {
  hostUserId: string;
  isParticipant: boolean;
  participantRealtimeKey: string | null;
};

/**
 * @swagger
 * /api/realtime:
 *   get:
 *     summary: Opens authenticated Upstash Realtime subscriptions for a live Game Quiz.
 *     description: Subscriptions are limited to shared session updates, host updates for the session host or an admin, and the authenticated player's own channel. Browser event publishing is not supported.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Server-sent event stream opened.
 *       401:
 *         description: Authentication is required.
 *       403:
 *         description: One or more requested channels are not authorized.
 */
export async function GET(request: Request): Promise<Response> {
  const realtimeHandler = handle({
    realtime: getGameQuizRealtime(),
    middleware: authorizeGameQuizRealtimeChannels,
  });
  return (await realtimeHandler(request))!;
}

async function authorizeGameQuizRealtimeChannels({
  request,
  channels,
}: {
  request: Request;
  channels: string[];
}): Promise<Response | void> {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return Response.json(
      { message: 'Unauthorized. Please log in.' },
      { status: 401 }
    );
  }

  const requestedChannels = channels.map(parseGameQuizRealtimeChannel);
  if (requestedChannels.some((channel) => !channel)) {
    return Response.json(
      { message: 'Forbidden. An invalid realtime channel was requested.' },
      { status: 403 }
    );
  }

  for (const channel of requestedChannels) {
    if (!channel) continue;

    const access = await getGameSessionAccess(
      channel.kind === 'player'
        ? { participantRealtimeKey: channel.participantRealtimeKey }
        : { realtimeKey: channel.realtimeKey },
      session.user.id
    );
    if (!access) {
      return Response.json(
        { message: 'Forbidden. The requested game session was not found.' },
        { status: 403 }
      );
    }

    const isHost =
      access.hostUserId === session.user.id || session.user.role === 'ADMIN';
    const canAccessShared = isHost || access.isParticipant;

    if (
      (channel.kind === 'shared' && !canAccessShared) ||
      (channel.kind === 'host' && !isHost) ||
      (channel.kind === 'player' &&
        (!access.isParticipant ||
          access.participantRealtimeKey !== channel.participantRealtimeKey))
    ) {
      return Response.json(
        { message: 'Forbidden. You cannot access this realtime channel.' },
        { status: 403 }
      );
    }
  }
}

async function getGameSessionAccess(
  selector: { realtimeKey: string } | { participantRealtimeKey: string },
  userId: string
): Promise<GameSessionAccessRow | null> {
  const gameSession = await prisma.gameSession.findFirst({
    where:
      'participantRealtimeKey' in selector
        ? {
            participants: {
              some: { realtimeKey: selector.participantRealtimeKey },
            },
          }
        : { realtimeKey: selector.realtimeKey },
    select: {
      hostId: true,
      participants: {
        where: { userId },
        select: { realtimeKey: true },
        take: 1,
      },
    },
  });

  if (!gameSession) return null;

  const participant = gameSession.participants[0];
  return {
    hostUserId: gameSession.hostId,
    isParticipant: Boolean(participant),
    participantRealtimeKey: participant?.realtimeKey ?? null,
  };
}
