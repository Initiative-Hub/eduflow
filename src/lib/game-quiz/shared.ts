import type { Prisma } from '@/generated/prisma';
import {
  findGameQuizWithQuestions,
  findGameSessionWithGameData,
  type GameQuizClient,
} from './database';
import { gameQuizError } from './errors';
import type {
  GameActor,
  GameQuizWithQuestions,
  SessionWithGameData,
} from './types';

export const isGameQuizAdmin = (actor: GameActor) => actor.role === 'ADMIN';

export const canManageGameQuiz = (actor: GameActor, ownerId: string) =>
  isGameQuizAdmin(actor) || actor.userId === ownerId;

export function requireGameQuizManager(
  actor: GameActor,
  quiz: GameQuizWithQuestions
) {
  if (!canManageGameQuiz(actor, quiz.ownerId)) {
    throw gameQuizError(
      'FORBIDDEN',
      403,
      'Only the Game Quiz owner can manage this definition.'
    );
  }
}

export function requireGameSessionHost(
  actor: GameActor,
  session: SessionWithGameData
) {
  if (!canManageGameQuiz(actor, session.hostId)) {
    throw gameQuizError(
      'FORBIDDEN',
      403,
      'Only the Game Session host can control this session.'
    );
  }
}

export async function requireGameQuiz(
  database: GameQuizClient,
  gameQuizId: string
) {
  const quiz = await findGameQuizWithQuestions(database, gameQuizId);
  if (!quiz) {
    throw gameQuizError('GAME_QUIZ_NOT_FOUND', 404, 'Game Quiz not found.');
  }
  return quiz;
}

export async function requireGameSession(
  database: GameQuizClient,
  sessionId: string
) {
  const session = await findGameSessionWithGameData(database, sessionId);
  if (!session) {
    throw gameQuizError(
      'GAME_SESSION_NOT_FOUND',
      404,
      'Game Session not found.'
    );
  }
  return session;
}

export function gameQuizRevisionWhere(
  actor: GameActor,
  id: string,
  revision: number
): Prisma.GameQuizWhereInput {
  return isGameQuizAdmin(actor)
    ? { id, revision }
    : { id, ownerId: actor.userId, revision };
}

export function gameSessionStateWhere(
  actor: GameActor,
  id: string,
  stateVersion: number
): Prisma.GameSessionWhereInput {
  return isGameQuizAdmin(actor)
    ? { id, stateVersion }
    : { id, hostId: actor.userId, stateVersion };
}

export function requireExpectedRevision(updatedCount: number, message: string) {
  if (updatedCount === 0) {
    throw gameQuizError('REVISION_CONFLICT', 409, message);
  }
}

export function requireExpectedState(updatedCount: number) {
  if (updatedCount === 0) {
    throw gameQuizError(
      'STATE_CONFLICT',
      409,
      'The Game Session changed. Refresh before controlling it.'
    );
  }
}

export function currentGameRound(session: SessionWithGameData) {
  if (session.currentRoundIndex === null) {
    return null;
  }

  return (
    session.rounds.find(
      (round) => round.orderIndex === session.currentRoundIndex
    ) ?? null
  );
}

export function requireGameSessionPhase(
  session: SessionWithGameData,
  phases: SessionWithGameData['phase'][]
) {
  if (!phases.includes(session.phase)) {
    throw gameQuizError(
      'INVALID_SESSION_PHASE',
      409,
      `This action is unavailable while the session is ${session.phase}.`
    );
  }
}
