import type { PrismaClient } from '../../../src/generated/prisma';
import type { SeededCourseRoles, SeededPlatformRoles } from '../role/types';

export type SeedPlatformPermissionsInput = {
  prisma: PrismaClient;
  platformRoles: SeededPlatformRoles;
};

export type SeedCoursePermissionsInput = {
  prisma: PrismaClient;
  courseRoles: SeededCourseRoles;
};
