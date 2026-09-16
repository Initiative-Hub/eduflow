import { isUniqueConstraintError } from '@/lib/game-quiz/database';
import { gameQuizError } from '@/lib/game-quiz/errors';
import {
  initializePartyKitRoom,
  terminatePartyKitRoom,
} from '@/lib/game-quiz/room-init';
import {
  type CreateGameSessionInput,
  GAME_QUIZ_TEMPLATE_KEY,
} from '@/lib/game-quiz/schemas';
import {
  requireGameQuiz,
  requireGameQuizManager,
  requireGameSession,
  requireGameSessionHost,
} from '@/lib/game-quiz/shared';
import { shuffle } from '@/lib/game-quiz/shuffle';
import type { GameActor, GameQuizWithQuestions } from '@/lib/game-quiz/types';
import { prisma } from '@/lib/prisma';

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

async function activateGameSession(actor: GameActor, sessionId: string) {
  const session = await requireGameSession(prisma, sessionId);
  if (session.hostId !== actor.userId && actor.role !== 'ADMIN') {
    throw gameQuizError(
      'FORBIDDEN',
      403,
      'Only the Game Session host can initialize its room.'
    );
  }
  if (session.runtimeStatus === 'ABORTED') {
    throw gameQuizError(
      'GAME_SESSION_ABORTED',
      409,
      'This Game Session can no longer be initialized.'
    );
  }
  if (session.runtimeStatus === 'INITIALIZING') {
    await initializePartyKitRoom(session);
    await prisma.gameSession.updateMany({
      where: { id: sessionId, runtimeStatus: 'INITIALIZING' },
      data: { runtimeStatus: 'ACTIVE' },
    });
  }
  return { sessionId };
}

export async function createGameSession(
  actor: GameActor,
  gameQuizId: string,
  input: CreateGameSessionInput
) {
  const existing = await prisma.gameSession.findUnique({
    where: { initializationKey: input.initializationKey },
  });
  if (existing) {
    if (
      existing.hostId !== actor.userId ||
      existing.gameQuizId !== gameQuizId
    ) {
      throw gameQuizError(
        'INITIALIZATION_CONFLICT',
        409,
        'This initialization key was already used for another Game Session.'
      );
    }
    return activateGameSession(actor, existing.id);
  }

  for (let attempt = 0; attempt < JOIN_CODE_ATTEMPTS; attempt += 1) {
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
            joinCode: createJoinCode(),
            randomizeQuestionOrder: quiz.randomizeQuestionOrder,
            randomizeAnswerOrder: quiz.randomizeAnswerOrder,
            initializationKey: input.initializationKey,
            runtimeStatus: 'INITIALIZING',
            rounds: { create: snapshotRounds(quiz) },
          },
        });
      });
      return activateGameSession(actor, created.id);
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      const raced = await prisma.gameSession.findUnique({
        where: { initializationKey: input.initializationKey },
      });
      if (raced) return activateGameSession(actor, raced.id);
    }
  }
  throw gameQuizError(
    'JOIN_CODE_UNAVAILABLE',
    503,
    'Could not allocate a join code. Please try again.'
  );
}

export async function leaveGameSession(
  actor: GameActor,
  gameQuizId: string,
  sessionId: string
) {
  const session = await requireGameSession(prisma, sessionId);
  if (session.gameQuizId !== gameQuizId) {
    throw gameQuizError(
      'GAME_SESSION_NOT_FOUND',
      404,
      'Game Session not found for this Game Quiz.'
    );
  }
  requireGameSessionHost(actor, session);
  if (session.endedAt) return { ended: true };

  await terminatePartyKitRoom(session.id);
  return { ended: true };
}
