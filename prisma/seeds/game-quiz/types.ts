import type { Prisma } from '../../../src/generated/prisma';

export type DemoGameQuizOption = {
  id: string;
  text: string;
  isCorrect: boolean;
  orderIndex: number;
};

export type DemoGameQuizQuestion = {
  id: string;
  prompt: string;
  hint: string;
  explanation: string;
  timerSeconds: number;
  maxPoints: number;
  orderIndex: number;
  options: DemoGameQuizOption[];
};

export type DemoGameQuiz = {
  id: string;
  title: string;
  topic: string;
  difficulty: string;
  questions: DemoGameQuizQuestion[];
};

export type GameQuizSeedClient = {
  gameQuiz: {
    upsert: (args: Prisma.GameQuizUpsertArgs) => Promise<unknown>;
  };
};

export type SeedDemoGameQuizzesInput = {
  prisma: GameQuizSeedClient;
  teacherUserId: string;
};
