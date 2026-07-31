import { gameQuizError } from '@/lib/game-quiz/errors';
import { projectGameQuizDefinition } from '@/lib/game-quiz/projections';
import type {
  CreateGameQuizInput,
  SaveGameQuizQuestionsInput,
  UpdateGameQuizInput,
} from '@/lib/game-quiz/schemas';
import { GAME_QUIZ_TEMPLATE_KEY } from '@/lib/game-quiz/schemas';
import {
  gameQuizRevisionWhere,
  isGameQuizAdmin,
  requireExpectedRevision,
  requireGameQuiz,
  requireGameQuizManager,
} from '@/lib/game-quiz/shared';
import type { GameActor } from '@/lib/game-quiz/types';
import { prisma } from '@/lib/prisma';

export async function listGameQuizzes(actor: GameActor) {
  const database = prisma;
  const quizzes = await database.gameQuiz.findMany({
    where: isGameQuizAdmin(actor) ? {} : { ownerId: actor.userId },
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { questions: true, sessions: true } } },
  });

  return quizzes.map((quiz) => ({
    id: quiz.id,
    title: quiz.title,
    topic: quiz.topic,
    difficulty: quiz.difficulty,
    templateKey: quiz.templateKey,
    revision: quiz.revision,
    randomizeQuestionOrder: quiz.randomizeQuestionOrder,
    randomizeAnswerOrder: quiz.randomizeAnswerOrder,
    showLeaderboard: quiz.showLeaderboard,
    questionCount: quiz._count.questions,
    sessionCount: quiz._count.sessions,
    createdAt: quiz.createdAt,
    updatedAt: quiz.updatedAt,
  }));
}

export async function createGameQuiz(
  actor: GameActor,
  input: CreateGameQuizInput
) {
  const database = prisma;
  const created = await database.gameQuiz.create({
    data: {
      ownerId: actor.userId,
      templateKey: GAME_QUIZ_TEMPLATE_KEY,
      revision: 1,
      ...input,
    },
  });

  return projectGameQuizDefinition(await requireGameQuiz(database, created.id));
}

export async function getGameQuiz(actor: GameActor, gameQuizId: string) {
  const database = prisma;
  const quiz = await requireGameQuiz(database, gameQuizId);
  requireGameQuizManager(actor, quiz);
  return projectGameQuizDefinition(quiz);
}

export async function updateGameQuiz(
  actor: GameActor,
  gameQuizId: string,
  input: UpdateGameQuizInput
) {
  const database = prisma;
  const quiz = await requireGameQuiz(database, gameQuizId);
  requireGameQuizManager(actor, quiz);

  const { expectedRevision, ...data } = input;
  const updated = await database.gameQuiz.updateMany({
    where: gameQuizRevisionWhere(actor, gameQuizId, expectedRevision),
    data: { ...data, revision: { increment: 1 } },
  });
  requireExpectedRevision(
    updated.count,
    'This Game Quiz was changed elsewhere. Refresh before saving.'
  );

  return projectGameQuizDefinition(await requireGameQuiz(database, gameQuizId));
}

export async function saveGameQuizQuestions(
  actor: GameActor,
  gameQuizId: string,
  input: SaveGameQuizQuestionsInput
) {
  await prisma.$transaction(async (transaction) => {
    const quiz = await requireGameQuiz(transaction, gameQuizId);
    requireGameQuizManager(actor, quiz);

    const updated = await transaction.gameQuiz.updateMany({
      where: gameQuizRevisionWhere(actor, gameQuizId, input.expectedRevision),
      data: {
        ...input.settings,
        status: 'READY',
        revision: { increment: 1 },
      },
    });
    requireExpectedRevision(
      updated.count,
      'This Game Quiz was changed elsewhere. Refresh before saving.'
    );

    await transaction.gameQuizQuestion.deleteMany({ where: { gameQuizId } });
    await Promise.all(
      input.questions.map((question, questionIndex) =>
        transaction.gameQuizQuestion.create({
          data: {
            gameQuizId,
            orderIndex: questionIndex,
            prompt: question.prompt,
            hint: question.hint,
            explanation: question.explanation,
            timerSeconds: question.timerSeconds,
            maxPoints: question.maxPoints,
            options: {
              create: question.options.map((option, optionIndex) => ({
                orderIndex: optionIndex,
                text: option.text,
                isCorrect: option.isCorrect,
              })),
            },
          },
        })
      )
    );
  });

  return getGameQuiz(actor, gameQuizId);
}

export async function deleteGameQuiz(actor: GameActor, gameQuizId: string) {
  const database = prisma;
  const quiz = await requireGameQuiz(database, gameQuizId);
  requireGameQuizManager(actor, quiz);

  const sessionCount = await database.gameSession.count({
    where: { gameQuizId },
  });
  if (sessionCount > 0) {
    throw gameQuizError(
      'GAME_QUIZ_HAS_SESSIONS',
      409,
      'A Game Quiz with session history cannot be deleted.'
    );
  }

  await database.gameQuiz.delete({ where: { id: gameQuizId } });
}
