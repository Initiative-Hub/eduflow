import { demoGameQuizzes } from './data';
import type { SeedDemoGameQuizzesInput } from './types';

export async function seedDemoGameQuizzes({
  prisma,
  teacherUserId,
}: SeedDemoGameQuizzesInput) {
  for (const gameQuiz of demoGameQuizzes) {
    const questions = gameQuiz.questions.map((question) => ({
      ...question,
      options: { create: question.options },
    }));

    await prisma.gameQuiz.upsert({
      where: { id: gameQuiz.id },
      update: {
        ownerId: teacherUserId,
        templateKey: 'LIVE_QUIZ_RALLY',
        status: 'READY',
        title: gameQuiz.title,
        topic: gameQuiz.topic,
        difficulty: gameQuiz.difficulty,
        randomizeQuestionOrder: false,
        randomizeAnswerOrder: true,
        archivedAt: null,
        questions: {
          deleteMany: {},
          create: questions,
        },
      },
      create: {
        id: gameQuiz.id,
        ownerId: teacherUserId,
        templateKey: 'LIVE_QUIZ_RALLY',
        status: 'READY',
        title: gameQuiz.title,
        topic: gameQuiz.topic,
        difficulty: gameQuiz.difficulty,
        randomizeQuestionOrder: false,
        randomizeAnswerOrder: true,
        questions: { create: questions },
      },
    });
  }

  return demoGameQuizzes.length;
}
