import * as z from 'zod';
import { errorResponse } from '@/lib/api/error-response';
import type { Session } from '@/lib/auth';
import { isGameQuizError } from './errors';
import {
  resolveLiveGameContext,
  type LiveGameAudience,
} from './live-game-context';
import type { GameActor, GameActorRole } from './types';

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

export async function resolveRequestLiveGameContext({
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
  return resolveLiveGameContext({
    actor: gameActorFromSession(session),
    audience,
    expectedGameQuizId,
    token: request.headers.get('x-live-game-context'),
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
