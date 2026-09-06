import {
  requireGameSession,
  requireGameSessionHost,
} from '@/lib/game-quiz/shared';
import type {
  GameActor,
  GameAnswerRecord,
  GameSessionReport,
  SessionWithGameData,
} from '@/lib/game-quiz/types';
import { prisma } from '@/lib/prisma';

const average = (values: number[]) =>
  values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) / values.length;

export function buildGameSessionReport(
  session: SessionWithGameData
): GameSessionReport {
  const answersByRound = new Map<string, GameAnswerRecord[]>();
  for (const answer of session.answers) {
    answersByRound.set(answer.roundId, [
      ...(answersByRound.get(answer.roundId) ?? []),
      answer,
    ]);
  }
  return {
    session: {
      gameTitle: session.title,
      gameQuizId: session.gameQuizId,
      joinCode: session.joinCode,
      phase: session.phase,
      createdAt: session.createdAt.toISOString(),
      completedAt: session.endedAt?.toISOString() ?? null,
    },
    rounds: session.rounds.map((round) => {
      const answers = answersByRound.get(round.id) ?? [];
      return {
        id: round.id,
        order: round.orderIndex,
        prompt: round.prompt,
        responseCount: answers.length,
        correctCount: answers.filter((answer) => answer.isCorrect).length,
        averagePoints: average(answers.map((answer) => answer.pointsAwarded)),
      };
    }),
    participants: session.participants.map((participant) => ({
      id: participant.id,
      displayName: participant.displayName,
      score: participant.score,
    })),
  };
}

export async function getGameSessionReport(
  actor: GameActor,
  sessionId: string
): Promise<GameSessionReport | null> {
  const session = await requireGameSession(prisma, sessionId);
  requireGameSessionHost(actor, session);
  return session.runtimeStatus === 'FINALIZED'
    ? buildGameSessionReport(session)
    : null;
}
