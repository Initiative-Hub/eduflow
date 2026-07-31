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
  requireGameSessionPhase,
} from '@/lib/game-quiz/shared';
import { shuffle } from '@/lib/game-quiz/shuffle';
import type {
  GameActor,
  GameQuizWithQuestions,
  GameRoundRecord,
} from '@/lib/game-quiz/types';

const JOIN_CODE_ATTEMPTS = 12;

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
            showLeaderboard: quiz.showLeaderboard,
            stateVersion: 1,
            rounds: { create: snapshotRounds(quiz) },
          },
        });
      });

      const database = prisma;
      return projectSessionForActor(
        await requireGameSession(database, created.id),
        actor
      );
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

  return projectSessionForActor(
    await requireGameSession(database, session.id),
    actor
  );
}

export async function getGameSession(actor: GameActor, sessionId: string) {
  const session = await requireGameSession(prisma, sessionId);
  const projection = projectSessionForActor(session, actor);
  if (!projection) {
    throw gameQuizError(
      'FORBIDDEN',
      403,
      'Join this Game Session before viewing it.'
    );
  }
  return projection;
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
        await openRound(transaction, firstRound, now);
        data = {
          phase: 'QUESTION_OPEN',
          currentRoundIndex: firstRound.orderIndex,
          startedAt: now,
        };
        break;
      }
      case 'LOCK_ANSWERS':
        requireGameSessionPhase(session, ['QUESTION_OPEN']);
        data = { phase: 'ANSWER_LOCKED' };
        break;
      case 'REVEAL':
        requireGameSessionPhase(session, ['QUESTION_OPEN', 'ANSWER_LOCKED']);
        if (!currentRound) {
          throw gameQuizError(
            'GAME_ROUND_NOT_FOUND',
            409,
            'There is no active round to reveal.'
          );
        }
        await transaction.gameRound.update({
          where: { id: currentRound.id },
          data: { revealedAt: now },
        });
        data = { phase: 'REVEAL' };
        break;
      case 'SHOW_PROGRESS':
        requireGameSessionPhase(session, ['REVEAL']);
        data = { phase: 'PROGRESS' };
        break;
      case 'OPEN_NEXT': {
        requireGameSessionPhase(session, ['REVEAL', 'PROGRESS']);
        const nextRound = session.rounds.find(
          (round) => round.orderIndex === (session.currentRoundIndex ?? -1) + 1
        );
        if (!nextRound) {
          data = {
            phase: 'FINAL_CELEBRATION',
            joiningLocked: true,
            joinCodeReleasedAt: now,
          };
          break;
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
          'ANSWER_LOCKED',
          'REVEAL',
          'PROGRESS',
        ]);
        data = { joiningLocked: input.joiningLocked };
        break;
      case 'END':
        requireGameSessionPhase(session, [
          'LOBBY',
          'QUESTION_OPEN',
          'ANSWER_LOCKED',
          'REVEAL',
          'PROGRESS',
          'FINAL_CELEBRATION',
        ]);
        data = {
          phase: 'REPORT',
          joiningLocked: true,
          endedAt: now,
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
  });

  return getGameSession(actor, sessionId);
}
