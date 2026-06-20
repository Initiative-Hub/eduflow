import type { PrismaClient } from '../../../src/generated/prisma';
import type { TiptapDocument } from '../../../src/utils/lesson-content';

export type DemoLesson = {
  id: string;
  title: string;
  orderIndex: number;
  content: TiptapDocument;
};

export type SeedLessonInput = {
  prisma: PrismaClient;
  moduleId: string;
  lessonData: DemoLesson;
};
