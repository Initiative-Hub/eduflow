import type { PrismaClient } from '../../../src/generated/prisma';
import type { DemoLesson } from '../lesson/types';

export type DemoModule = {
  id: string;
  title: string;
  orderIndex: number;
  lessons: DemoLesson[];
};

export type SeedModuleInput = {
  prisma: PrismaClient;
  courseId: string;
  moduleData: DemoModule;
};
