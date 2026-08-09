import {
  findAnswerByIdempotencyKey,
  findAnswerByParticipantAndRound,
  findParticipant,
  type GameQuizDatabase,
  isUniqueConstraintError,
} from '@/lib/game-quiz/database';
import { gameQuizError } from '@/lib/game-quiz/errors';
import type { SubmitGameAnswerInput } from '@/lib/game-quiz/schemas';
import { calculateGamePoints } from '@/lib/game-quiz/scoring';
import {
  currentGameRound,
  requireGameSession,
  requireGameSessionHost,
  requireGameSessionPhase,
} from '@/lib/game-quiz/shared';
import type {
  GameActor,
  GameAnswerRecord,
  GameSessionReport,
  SessionWithGameData,
} from '@/lib/game-quiz/types';
import { prisma } from '@/lib/prisma';

function projectSubmittedAnswer(answer: GameAnswerRecord, idempotent: boolean) {
  return {
    participantId: answer.participantId,
    roundId: answer.roundId,
    selectedOptionId: answer.selectedOptionId,
    submittedAt: answer.submittedAt,
    responseTimeMs: answer.responseTimeMs,
    idempotent,
  };
}

async function submitAnswerInTransaction(
  database: GameQuizDatabase,
  actor: GameActor,
  sessionId: string,
  input: SubmitGameAnswerInput
) {
  const session = await requireGameSession(database, sessionId);
  const participant = session.participants.find(
    (candidate) => candidate.userId === actor.userId
  );
  if (!participant) {
    throw gameQuizError(
      'GAME_PARTICIPANT_NOT_FOUND',
      403,
      'Join this Game Session before submitting an answer.'
    );
  }

  const existingByKey = await findAnswerByIdempotencyKey(
    database,
    participant.id,
    input.idempotencyKey
  );
  if (existingByKey) {
    if (existingByKey.roundId !== input.roundId) {
      throw gameQuizError(
        'IDEMPOTENCY_KEY_REUSED',
        409,
        'This idempotency key was already used for a different round.'
      );
    }
    return projectSubmittedAnswer(existingByKey, true);
  }

  const existingForRound = await findAnswerByParticipantAndRound(
    database,
    participant.id,
    input.roundId
  );
  if (existingForRound) {
    throw gameQuizError(
      'ANSWER_ALREADY_SUBMITTED',
      409,
      'An answer was already submitted for this round.'
    );
  }

  requireGameSessionPhase(session, ['QUESTION_OPEN']);
  const currentRound = currentGameRound(session);
  if (!currentRound || currentRound.id !== input.roundId) {
    throw gameQuizError(
      'ROUND_NOT_ACTIVE',
      409,
      'This round is not currently accepting answers.'
    );
  }
  if (!currentRound.openedAt || !currentRound.deadlineAt) {
    throw gameQuizError(
      'ROUND_NOT_OPEN',
      409,
      'This round has not been opened yet.'
    );
  }

  // Claim the session row before writing an answer. A concurrent Skip or
  // automatic reveal uses the same row transition, so only the action that
  // acquires this guard first can complete.
  const openState = await database.gameSession.updateMany({
    where: { id: sessionId, phase: 'QUESTION_OPEN' },
    data: { stateVersion: { increment: 0 } },
  });
  if (openState.count === 0) {
    throw gameQuizError(
      'ROUND_CLOSED',
      409,
      'This round is no longer accepting answers.'
    );
  }
  if (new Date() >= currentRound.deadlineAt) {
    throw gameQuizError('ROUND_CLOSED', 409, 'The answer deadline has passed.');
  }

  const submittedAt = new Date();
  if (submittedAt >= currentRound.deadlineAt) {
    throw gameQuizError('ROUND_CLOSED', 409, 'The answer deadline has passed.');
  }

  const selectedOption = currentRound.options.find(
    (option) => option.id === input.selectedOptionId
  );
  if (!selectedOption) {
    throw gameQuizError(
      'OPTION_NOT_FOUND',
      400,
      'The selected option does not belong to this round.'
    );
  }

  const responseTimeMs =
    submittedAt.getTime() - currentRound.openedAt.getTime();
  const pointsAwarded = calculateGamePoints(
    currentRound.maxPoints,
    responseTimeMs,
    currentRound.timerSeconds,
    selectedOption.isCorrect
  );
  const answer = (await database.gameAnswer.create({
    data: {
      sessionId,
      participantId: participant.id,
      roundId: currentRound.id,
      selectedOptionId: selectedOption.id,
      idempotencyKey: input.idempotencyKey,
      submittedAt,
      responseTimeMs,
      isCorrect: selectedOption.isCorrect,
      pointsAwarded,
    },
  })) as GameAnswerRecord;

  await database.gameParticipant.update({
    where: { id: participant.id },
    data: { score: { increment: pointsAwarded }, lastSeenAt: submittedAt },
  });

  return projectSubmittedAnswer(answer, false);
}

export async function submitGameAnswer(
  actor: GameActor,
  sessionId: string,
  input: SubmitGameAnswerInput
) {
  const database = prisma;
  try {
    return await prisma.$transaction((transaction) =>
      submitAnswerInTransaction(transaction, actor, sessionId, input)
    );
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const participant = await findParticipant(
      database,
      sessionId,
      actor.userId
    );
    if (!participant) {
      throw error;
    }
    const existingByKey = await findAnswerByIdempotencyKey(
      database,
      participant.id,
      input.idempotencyKey
    );
    if (existingByKey?.roundId === input.roundId) {
      return projectSubmittedAnswer(existingByKey, true);
    }

    throw gameQuizError(
      'ANSWER_ALREADY_SUBMITTED',
      409,
      'An answer was already submitted for this round.'
    );
  }
}

export async function getHostAnswerProgress(
  actor: GameActor,
  sessionId: string
) {
  const database = prisma;
  const session = await requireGameSession(database, sessionId);
  requireGameSessionHost(actor, session);
  const round = currentGameRound(session);

  if (!round) {
    return {
      sessionId,
      roundId: null,
      stateVersion: session.stateVersion,
      participantCount: session.participants.length,
      answerCount: 0,
      pendingCount: session.participants.length,
    };
  }

  const answerCount = await database.gameAnswer.count({
    where: { roundId: round.id },
  });
  return {
    sessionId,
    roundId: round.id,
    stateVersion: session.stateVersion,
    participantCount: session.participants.length,
    answerCount,
    pendingCount: Math.max(0, session.participants.length - answerCount),
  };
}

function average(values: number[]) {
  return values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

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
      const correctCount = answers.filter((answer) => answer.isCorrect).length;
      return {
        id: round.id,
        order: round.orderIndex,
        prompt: round.prompt,
        responseCount: answers.length,
        correctCount,
        averagePoints: average(answers.map((answer) => answer.pointsAwarded)),
      };
    }),
    participants: session.participants.map((participant) => {
      return {
        id: participant.id,
        displayName: participant.displayName,
        score: participant.score,
      };
    }),
  };
}

export async function getGameSessionReport(
  actor: GameActor,
  sessionId: string
): Promise<GameSessionReport> {
  const session = await requireGameSession(prisma, sessionId);
  requireGameSessionHost(actor, session);
  return buildGameSessionReport(session);
}
