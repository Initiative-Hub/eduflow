import type { PrismaClient } from '../../../src/generated/prisma';
import type { DemoModule } from '../module/types';

export type DemoCourse = {
  id: string;
  title: string;
  description: string;
  isPublished: boolean;
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
