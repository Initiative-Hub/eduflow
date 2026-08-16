import type { Prisma } from '@/generated/prisma';
import type { prisma } from '@/lib/prisma';
import type {
  GameAnswerRecord,
  GameParticipantRecord,
  GameQuizWithQuestions,
  GameSessionRecord,
  SessionWithGameData,
} from './types';

export type GameQuizDatabase = Prisma.TransactionClient;
export type GameQuizClient = GameQuizDatabase | typeof prisma;

const gameQuizQuestionsInclude = {
  questions: {
    orderBy: { orderIndex: 'asc' },
    include: { options: { orderBy: { orderIndex: 'asc' } } },
  },
} satisfies Prisma.GameQuizInclude;

const sessionGameDataInclude = {
  rounds: {
    orderBy: { orderIndex: 'asc' },
    include: { options: { orderBy: { orderIndex: 'asc' } } },
  },
  participants: {
    orderBy: [{ score: 'desc' }, { joinedAt: 'asc' }],
    include: { user: { select: { id: true, name: true, image: true } } },
  },
  answers: {
    include: {
      participant: true,
      round: { include: { options: true } },
    },
  },
} satisfies Prisma.GameSessionInclude;

export async function findGameQuizWithQuestions(
  database: GameQuizClient,
  gameQuizId: string
): Promise<GameQuizWithQuestions | null> {
  return (await database.gameQuiz.findUnique({
    where: { id: gameQuizId },
    include: gameQuizQuestionsInclude,
  })) as GameQuizWithQuestions | null;
}

export async function findGameSessionWithGameData(
  database: GameQuizClient,
  sessionId: string
): Promise<SessionWithGameData | null> {
  return (await database.gameSession.findUnique({
    where: { id: sessionId },
    include: sessionGameDataInclude,
  })) as SessionWithGameData | null;
}

export async function findSessionByJoinCode(
  database: GameQuizClient,
  joinCode: string
): Promise<GameSessionRecord | null> {
  return (await database.gameSession.findFirst({
    where: { joinCode, joinCodeReleasedAt: null },
  })) as GameSessionRecord | null;
}

export async function findParticipant(
  database: GameQuizClient,
  sessionId: string,
  userId: string
): Promise<GameParticipantRecord | null> {
  return (await database.gameParticipant.findFirst({
    where: { sessionId, userId },
  })) as GameParticipantRecord | null;
}

export async function findAnswerByParticipantAndRound(
  database: GameQuizClient,
  participantId: string,
  roundId: string
): Promise<GameAnswerRecord | null> {
  return (await database.gameAnswer.findUnique({
    where: { participantId_roundId: { participantId, roundId } },
  })) as GameAnswerRecord | null;
}

export async function findAnswerByIdempotencyKey(
  database: GameQuizClient,
  participantId: string,
  idempotencyKey: string
): Promise<GameAnswerRecord | null> {
  return (await database.gameAnswer.findUnique({
    where: { participantId_idempotencyKey: { participantId, idempotencyKey } },
  })) as GameAnswerRecord | null;
}

export function isUniqueConstraintError(error: unknown) {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
  );
}
