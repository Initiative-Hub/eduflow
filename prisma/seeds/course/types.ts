import type { PrismaClient } from '../../../src/generated/prisma';
import type { TiptapDocument } from '../../../src/utils/lesson-content';
import type { DemoModule } from '../module/types';

export type DemoAssignment = {
  id: string;
  title: string;
  content: TiptapDocument;
  dueAt: Date | null;
  maxPoints: number;
};

export type DemoCourse = {
  id: string;
  title: string;
  description: string;
  isPublished: boolean;
  assignments: DemoAssignment[];
  modules: DemoModule[];
};

export type SeedCourseEnrollmentInput = {
  prisma: PrismaClient;
  courseId: string;
  memberId: string;
  roleId: string;
};

export type SeedDemoCoursesInput = {
  prisma: PrismaClient;
  teacherUserId: string;
  studentUserId: string;
  courseOwnerRoleId: string;
  courseStudentRoleId: string;
};
