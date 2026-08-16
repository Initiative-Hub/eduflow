import * as z from 'zod';
import { errorResponse } from '@/lib/api/error-response';
import type { Session } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { gameQuizError, isGameQuizError } from './errors';
import { requireGameSession, requireGameSessionHost } from './shared';
import type { GameActor, GameActorRole } from './types';

type LiveGameAudience = 'HOST' | 'PARTICIPANT';

const gameActorRoles = new Set<GameActorRole>([
  'ADMIN',
  'TEACHER',
  'STUDENT',
  null,
]);

export function gameActorFromSession(session: Session): GameActor {
  const role = session.user.role;
  return {
    userId: session.user.id,
    name: session.user.name,
    role: gameActorRoles.has(role as GameActorRole)
      ? (role as GameActorRole)
      : null,
  };
}

export async function resolveLiveGameSession({
  actor,
  audience,
  expectedGameQuizId,
  sessionId,
}: {
  actor: GameActor;
  audience: LiveGameAudience;
  expectedGameQuizId?: string;
  sessionId: string;
}) {
  const gameSession = await requireGameSession(prisma, sessionId);
  if (expectedGameQuizId && gameSession.gameQuizId !== expectedGameQuizId) {
    throw gameQuizError(
      'GAME_SESSION_NOT_FOUND',
      404,
      'Game Session not found for this Game Quiz.'
    );
  }

  if (audience === 'HOST') {
    requireGameSessionHost(actor, gameSession);
    return { participantId: null, sessionId: gameSession.id };
  }

  const participant = gameSession.participants.find(
    (candidate) => candidate.userId === actor.userId
  );
  if (!participant) {
    throw gameQuizError(
      'FORBIDDEN',
      403,
      'Join this Game Session before accessing it.'
    );
  }
  return { participantId: participant.id, sessionId: gameSession.id };
}

export async function resolveRequestLiveGameSession({
  audience,
  expectedGameQuizId,
  request,
  session,
}: {
  audience: LiveGameAudience;
  expectedGameQuizId?: string;
  request: Request;
  session: Session;
}) {
  const parsedSessionId = z
    .uuid()
    .safeParse(request.headers.get('x-live-game-session'));
  if (!parsedSessionId.success) {
    throw gameQuizError(
      'GAME_SESSION_REQUIRED',
      400,
      'A live Game Session ID is required.'
    );
  }

  return resolveLiveGameSession({
    actor: gameActorFromSession(session),
    audience,
    expectedGameQuizId,
    sessionId: parsedSessionId.data,
  });
}

export async function parseGameQuizBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<ReturnType<T['safeParse']>> {
  try {
    return schema.safeParse(await request.json()) as ReturnType<T['safeParse']>;
  } catch {
    return {
      success: false,
      error: new z.ZodError([
        {
          code: 'custom',
          path: [],
          message: 'Request body must be valid JSON.',
        },
      ]),
    } as ReturnType<T['safeParse']>;
  }
}

export function validationErrorResponse(error: z.ZodError, message: string) {
  return errorResponse('VALIDATION_ERROR', message, 400, error.format());
}

export function gameQuizExceptionResponse(
  error: unknown,
  fallbackMessage: string
) {
  if (isGameQuizError(error)) {
    return errorResponse(
      error.code,
      error.message,
      error.status,
      error.details
    );
  }

  console.error(fallbackMessage, error);
  return errorResponse('INTERNAL_ERROR', fallbackMessage, 500);
}
