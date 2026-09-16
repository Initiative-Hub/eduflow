import type { Prisma } from '@/generated/prisma';
import type { prisma } from '@/lib/prisma';
import type { GameQuizWithQuestions, SessionWithGameData } from './types';

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

export function isUniqueConstraintError(error: unknown) {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
  );
}
