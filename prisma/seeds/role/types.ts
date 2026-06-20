import type { PrismaClient } from '../../../src/generated/prisma';
import type { COURSE_ROLE_NAMES, PLATFORM_ROLE_NAMES } from './data';

export type PlatformRoleName = (typeof PLATFORM_ROLE_NAMES)[number];
export type CourseRoleName = (typeof COURSE_ROLE_NAMES)[number];

export type SeedRole = {
  id: string;
  name: string;
};

export type SeededPlatformRoles = Record<PlatformRoleName, SeedRole>;
export type SeededCourseRoles = Record<CourseRoleName, SeedRole>;

export type SeedPlatformRolesInput = {
  prisma: PrismaClient;
};

export type SeedCourseRolesInput = {
  prisma: PrismaClient;
};
