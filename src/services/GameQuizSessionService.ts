import type { Prisma } from '@/generated/prisma';
import {
  findParticipant,
  findSessionByJoinCode,
  isUniqueConstraintError,
  type GameQuizDatabase,
} from '@/lib/game-quiz/database';
import { prisma } from '@/lib/prisma';
import { gameQuizError } from '@/lib/game-quiz/errors';
import { projectSessionForActor } from '@/lib/game-quiz/projections';
import type {
  CreateGameSessionInput,
  HostCommandInput,
  JoinGameSessionInput,
} from '@/lib/game-quiz/schemas';
import { GAME_QUIZ_TEMPLATE_KEY } from '@/lib/game-quiz/schemas';
import {
  currentGameRound,
  gameSessionStateWhere,
  requireExpectedState,
  requireGameQuiz,
  requireGameQuizManager,
  requireGameSession,
  requireGameSessionHost,
  requireGameSessionOpen,
  requireGameSessionPhase,
  nextHostedGamePhase,
  shouldAutoRevealGameRound,
} from '@/lib/game-quiz/shared';
import { shuffle } from '@/lib/game-quiz/shuffle';
import type {
  GameActor,
  GameQuizWithQuestions,
  GameRoundRecord,
} from '@/lib/game-quiz/types';

const JOIN_CODE_ATTEMPTS = 12;
const HOST_LEASE_MS = 30_000;

function createJoinCode() {
  return String(Math.floor(100_000 + Math.random() * 900_000));
}

function snapshotRounds(quiz: GameQuizWithQuestions) {
  const questions = quiz.randomizeQuestionOrder
    ? shuffle(quiz.questions)
    : [...quiz.questions];

  return questions.map((question, questionIndex) => {
    const options = quiz.randomizeAnswerOrder
      ? shuffle(question.options)
      : [...question.options];

    return {
      sourceQuestionId: question.id,
      orderIndex: questionIndex,
      prompt: question.prompt,
      hint: question.hint,
      explanation: question.explanation,
      timerSeconds: question.timerSeconds,
      maxPoints: question.maxPoints,
      options: {
        create: options.map((option, optionIndex) => ({
          sourceOptionId: option.id,
          orderIndex: optionIndex,
          text: option.text,
          isCorrect: option.isCorrect,
        })),
      },
    };
  });
}

export async function createGameSession(
  actor: GameActor,
  gameQuizId: string,
  input: CreateGameSessionInput
) {
  for (let attempt = 0; attempt < JOIN_CODE_ATTEMPTS; attempt += 1) {
    const joinCode = createJoinCode();
    try {
      const created = await prisma.$transaction(async (transaction) => {
        const quiz = await requireGameQuiz(transaction, gameQuizId);
        requireGameQuizManager(actor, quiz);

        if (quiz.revision !== input.expectedRevision) {
          throw gameQuizError(
            'REVISION_CONFLICT',
            409,
            'This Game Quiz was changed elsewhere. Refresh before hosting it.'
          );
        }
        if (quiz.questions.length === 0) {
          throw gameQuizError(
            'GAME_QUIZ_EMPTY',
            409,
            'Add at least one question before hosting this Game Quiz.'
          );
        }

        return transaction.gameSession.create({
          data: {
            gameQuizId: quiz.id,
            hostId: actor.userId,
            gameQuizRevision: quiz.revision,
            templateKey: GAME_QUIZ_TEMPLATE_KEY,
            title: quiz.title,
            topic: quiz.topic,
            difficulty: quiz.difficulty,
            joinCode,
            phase: 'LOBBY',
            currentRoundIndex: null,
            joiningLocked: false,
            randomizeQuestionOrder: quiz.randomizeQuestionOrder,
            randomizeAnswerOrder: quiz.randomizeAnswerOrder,
            stateVersion: 1,
            lastHostSeenAt: new Date(),
            rounds: { create: snapshotRounds(quiz) },
          },
        });
      });

      const database = prisma;
      const projection = await projectSessionForActor(
        await requireGameSession(database, created.id),
        actor
      );
      if (!projection) {
        throw new Error('Created Game Session is not accessible to its host.');
      }
      return { ...projection, sessionId: created.id };
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }
    }
  }

  throw gameQuizError(
    'JOIN_CODE_UNAVAILABLE',
    503,
    'Could not allocate a join code. Please try again.'
  );
}

export async function joinGameSession(
  actor: GameActor,
  input: JoinGameSessionInput
) {
  const database = prisma;
  const session = await findSessionByJoinCode(database, input.joinCode);
  if (!session) {
    throw gameQuizError(
      'GAME_SESSION_NOT_FOUND',
      404,
      'No active Game Session uses this join code.'
    );
  }

  const existingParticipant = await findParticipant(
    database,
    session.id,
    actor.userId
  );
  if (existingParticipant) {
    await database.gameParticipant.update({
      where: { id: existingParticipant.id },
      data: { lastSeenAt: new Date() },
    });
  } else {
    if (session.joiningLocked) {
      throw gameQuizError(
        'JOINING_LOCKED',
        409,
        'The host has locked joining for this Game Session.'
      );
    }

    try {
      await database.gameParticipant.create({
        data: {
          sessionId: session.id,
          userId: actor.userId,
          displayName: input.displayName ?? actor.name,
          lastSeenAt: new Date(),
        },
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }
    }
  }

  const projection = await projectSessionForActor(
    await requireGameSession(database, session.id),
    actor
  );
  if (!projection) {
    throw gameQuizError('FORBIDDEN', 403, 'Join this Game Session first.');
  }
  return { ...projection, sessionId: session.id };
}

export async function getGameSession(actor: GameActor, sessionId: string) {
  await reconcileExpiredHostLease(sessionId);
  await reconcileOpenGameSession(sessionId);
  const session = await requireGameSession(prisma, sessionId);
  const projection = await projectSessionForActor(session, actor);
  if (!projection) {
    throw gameQuizError(
      'FORBIDDEN',
      403,
      'Join this Game Session before viewing it.'
    );
  }
  return projection;
}

export async function heartbeatGameSessionHost(
  actor: GameActor,
  sessionId: string
) {
  const session = await requireGameSession(prisma, sessionId);
  requireGameSessionHost(actor, session);
  await prisma.gameSession.updateMany({
    where: { id: sessionId, endedAt: null },
    data: { lastHostSeenAt: new Date() },
  });
}

export async function closeGameSession(
  actor: GameActor,
  sessionId: string,
  reason: 'HOST_LEFT' | 'VIEWED_REPORT'
) {
  await prisma.$transaction(async (transaction) => {
    const session = await requireGameSession(transaction, sessionId);
    requireGameSessionHost(actor, session);
    if (session.endedAt) return;
    const now = new Date();
    await transaction.gameSession.update({
      where: { id: sessionId },
      data: {
        closedReason: reason,
        endedAt: now,
        joinCodeReleasedAt: now,
        joiningLocked: true,
        stateVersion: { increment: 1 },
      },
    });
  });
  return getGameSession(actor, sessionId);
}

export async function reconcileExpiredHostLease(sessionId: string) {
  const expiresBefore = new Date(Date.now() - HOST_LEASE_MS);
  const now = new Date();
  const expired = await prisma.gameSession.updateMany({
    where: {
      id: sessionId,
      endedAt: null,
      OR: [{ lastHostSeenAt: null }, { lastHostSeenAt: { lt: expiresBefore } }],
    },
    data: {
      closedReason: 'HOST_LEFT',
      endedAt: now,
      joinCodeReleasedAt: now,
      joiningLocked: true,
      stateVersion: { increment: 1 },
    },
  });
  return expired.count > 0;
}

/**
 * Safely advances an open round when its deadline has passed or every joined
 * participant has answered. It is intentionally idempotent because snapshots
 * are polled by several clients at once.
 */
export async function reconcileOpenGameSession(sessionId: string) {
  return prisma.$transaction(async (transaction) => {
    const session = await requireGameSession(transaction, sessionId);
    const round = currentGameRound(session);
    const now = new Date();

    if (
      session.phase !== 'QUESTION_OPEN' ||
      !round ||
      !shouldAutoRevealGameRound({
        answerCount: session.answers.filter(
          (answer) => answer.roundId === round.id
        ).length,
        deadlineAt: round.deadlineAt,
        now,
        participantCount: session.participants.length,
      })
    ) {
      return false;
    }

    const updated = await transaction.gameSession.updateMany({
      where: {
        id: session.id,
        phase: 'QUESTION_OPEN',
        stateVersion: session.stateVersion,
      },
      data: { phase: 'REVEAL', stateVersion: { increment: 1 } },
    });
    if (updated.count === 0) return false;

    await transaction.gameRound.update({
      where: { id: round.id },
      data: { revealedAt: now },
    });
    return true;
  });
}

async function openRound(
  database: GameQuizDatabase,
  round: GameRoundRecord,
  now: Date
) {
  await database.gameRound.update({
    where: { id: round.id },
    data: {
      openedAt: now,
      deadlineAt: new Date(now.getTime() + round.timerSeconds * 1_000),
      revealedAt: null,
    },
  });
}

export async function controlGameSession(
  actor: GameActor,
  sessionId: string,
  input: HostCommandInput
) {
  await prisma.$transaction(async (transaction) => {
    const session = await requireGameSession(transaction, sessionId);
    requireGameSessionHost(actor, session);
    requireGameSessionOpen(session);
    if (session.stateVersion !== input.expectedStateVersion) {
      throw gameQuizError(
        'STATE_CONFLICT',
        409,
        'The Game Session changed. Refresh before controlling it.'
      );
    }

    const now = new Date();
    const currentRound = currentGameRound(session);
    let data: Prisma.GameSessionUpdateManyMutationInput;
    let roundToReveal: GameRoundRecord | null = null;

    switch (input.action) {
      case 'START': {
        requireGameSessionPhase(session, ['LOBBY']);
        const firstRound = session.rounds[0];
        if (!firstRound) {
          throw gameQuizError(
            'GAME_SESSION_EMPTY',
            409,
            'This Game Session has no rounds.'
          );
        }
        if (session.participants.length === 0) {
          throw gameQuizError(
            'GAME_SESSION_EMPTY',
            409,
            'At least one participant must join before the game starts.'
          );
        }
        await openRound(transaction, firstRound, now);
        data = {
          phase: 'QUESTION_OPEN',
          currentRoundIndex: firstRound.orderIndex,
          startedAt: now,
        };
        break;
      }
      case 'SKIP':
        requireGameSessionPhase(session, ['QUESTION_OPEN']);
        if (!currentRound) {
          throw gameQuizError(
            'GAME_ROUND_NOT_FOUND',
            409,
            'There is no active round to reveal.'
          );
        }
        data = { phase: 'REVEAL' };
        roundToReveal = currentRound;
        break;
      case 'NEXT': {
        const nextRound = session.rounds.find(
          (round) => round.orderIndex === (session.currentRoundIndex ?? -1) + 1
        );
        const nextPhase = nextHostedGamePhase(
          session.phase,
          Boolean(nextRound)
        );
        if (nextPhase === 'SCOREBOARD') {
          data = { phase: nextPhase };
          break;
        }
        if (nextPhase === 'FINAL_CELEBRATION') {
          data = {
            phase: nextPhase,
            joiningLocked: true,
            joinCodeReleasedAt: now,
          };
          break;
        }
        requireGameSessionPhase(session, ['SCOREBOARD']);
        if (!nextRound) {
          throw gameQuizError(
            'GAME_ROUND_NOT_FOUND',
            409,
            'There is no next round to open.'
          );
        }
        await openRound(transaction, nextRound, now);
        data = {
          phase: 'QUESTION_OPEN',
          currentRoundIndex: nextRound.orderIndex,
        };
        break;
      }
      case 'SET_JOINING_LOCKED':
        requireGameSessionPhase(session, [
          'LOBBY',
          'QUESTION_OPEN',
          'REVEAL',
          'SCOREBOARD',
        ]);
        data = { joiningLocked: input.joiningLocked };
        break;
      case 'END_GAME':
        requireGameSessionPhase(session, [
          'QUESTION_OPEN',
          'REVEAL',
          'SCOREBOARD',
        ]);
        data = {
          phase: 'FINAL_CELEBRATION',
          joiningLocked: true,
          joinCodeReleasedAt: now,
        };
        break;
    }

    const updated = await transaction.gameSession.updateMany({
      where: gameSessionStateWhere(
        actor,
        sessionId,
        input.expectedStateVersion
      ),
      data: { ...data, stateVersion: { increment: 1 } },
    });
    requireExpectedState(updated.count);

    if (roundToReveal) {
      await transaction.gameRound.update({
        where: { id: roundToReveal.id },
        data: { revealedAt: now },
      });
    }
  });

  return getGameSession(actor, sessionId);
}
