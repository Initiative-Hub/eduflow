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
import type { GameActor, GameAnswerRecord } from '@/lib/game-quiz/types';
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

export async function getGameSessionReport(
  actor: GameActor,
  sessionId: string
) {
  const session = await requireGameSession(prisma, sessionId);
  requireGameSessionHost(actor, session);

  const answersByRound = new Map<string, GameAnswerRecord[]>();
  const answersByParticipant = new Map<string, GameAnswerRecord[]>();
  for (const answer of session.answers) {
    answersByRound.set(answer.roundId, [
      ...(answersByRound.get(answer.roundId) ?? []),
      answer,
    ]);
    answersByParticipant.set(answer.participantId, [
      ...(answersByParticipant.get(answer.participantId) ?? []),
      answer,
    ]);
  }

  return {
    session: {
      id: session.id,
      title: session.title,
      topic: session.topic,
      difficulty: session.difficulty,
      phase: session.phase,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      participantCount: session.participants.length,
      stateVersion: session.stateVersion,
    },
    rounds: session.rounds.map((round) => {
      const answers = answersByRound.get(round.id) ?? [];
      const correctCount = answers.filter((answer) => answer.isCorrect).length;
      return {
        id: round.id,
        orderIndex: round.orderIndex,
        prompt: round.prompt,
        answerCount: answers.length,
        correctCount,
        correctRate: answers.length === 0 ? 0 : correctCount / answers.length,
        averageResponseTimeMs: average(
          answers.map((answer) => answer.responseTimeMs)
        ),
        averagePoints: average(answers.map((answer) => answer.pointsAwarded)),
      };
    }),
    participants: session.participants.map((participant, index) => {
      const answers = answersByParticipant.get(participant.id) ?? [];
      const correctCount = answers.filter((answer) => answer.isCorrect).length;
      return {
        rank: index + 1,
        id: participant.id,
        userId: participant.userId,
        displayName: participant.displayName,
        score: participant.score,
        answerCount: answers.length,
        correctCount,
        averageResponseTimeMs: average(
          answers.map((answer) => answer.responseTimeMs)
        ),
      };
    }),
  };
}
