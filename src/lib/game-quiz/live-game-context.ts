import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { gameQuizError } from './errors';
import { requireGameSession, requireGameSessionHost } from './shared';
import type { GameActor } from './types';

const CONTEXT_TTL_MS = 24 * 60 * 60 * 1_000;

export type LiveGameAudience = 'HOST' | 'PARTICIPANT';

export type IssuedLiveGameContext = {
  audience: LiveGameAudience;
  contextKey: string;
  expiresAt: string;
  token: string;
};

export type ResolvedLiveGameContext = {
  audience: LiveGameAudience;
  participantId: string | null;
  sessionId: string;
};

function hashContextToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function issueLiveGameContext({
  actor,
  audience,
  participantId,
  sessionId,
}: {
  actor: GameActor;
  audience: LiveGameAudience;
  participantId?: string;
  sessionId: string;
}): Promise<IssuedLiveGameContext> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + CONTEXT_TTL_MS);
  const context = await prisma.gameSessionContext.create({
    data: {
      audience,
      expiresAt,
      participantId: participantId ?? null,
      sessionId,
      tokenHash: hashContextToken(token),
      userId: actor.userId,
    },
  });

  return {
    audience,
    contextKey: context.id,
    expiresAt: context.expiresAt.toISOString(),
    token,
  };
}

export async function resolveLiveGameContext({
  actor,
  audience,
  expectedGameQuizId,
  token,
}: {
  actor: GameActor;
  audience: LiveGameAudience;
  expectedGameQuizId?: string;
  token: string | null;
}): Promise<ResolvedLiveGameContext> {
  if (!token) {
    throw gameQuizError(
      'GAME_CONTEXT_REQUIRED',
      400,
      'A live game context is required.'
    );
  }

  const context = await prisma.gameSessionContext.findUnique({
    where: { tokenHash: hashContextToken(token) },
  });
  if (
    !context ||
    context.userId !== actor.userId ||
    context.audience !== audience ||
    context.revokedAt ||
    context.expiresAt <= new Date()
  ) {
    throw gameQuizError(
      'GAME_CONTEXT_UNAVAILABLE',
      404,
      'This live game context is no longer available.'
    );
  }

  const session = await requireGameSession(prisma, context.sessionId);
  if (expectedGameQuizId && session.gameQuizId !== expectedGameQuizId) {
    throw gameQuizError(
      'GAME_CONTEXT_UNAVAILABLE',
      404,
      'This live game context does not match the requested quiz.'
    );
  }

  if (audience === 'HOST') {
    requireGameSessionHost(actor, session);
  } else {
    const participant = session.participants.find(
      (candidate) => candidate.id === context.participantId
    );
    if (!participant || participant.userId !== actor.userId) {
      throw gameQuizError(
        'GAME_CONTEXT_UNAVAILABLE',
        404,
        'This live game context is no longer available.'
      );
    }
  }

  return {
    audience,
    participantId: context.participantId,
    sessionId: context.sessionId,
  };
}
