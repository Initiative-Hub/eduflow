import { randomUUID } from 'node:crypto';
import { COURSE_ROLE_NAMES, PLATFORM_ROLE_NAMES } from './data';
import type {
  CourseRoleName,
  SeedCourseRolesInput,
  SeededCourseRoles,
  SeededPlatformRoles,
  SeedPlatformRolesInput,
} from './types';

export async function seedPlatformRoles({
  prisma,
}: SeedPlatformRolesInput): Promise<SeededPlatformRoles> {
  const entries = await Promise.all(
    PLATFORM_ROLE_NAMES.map(async (name) => [
      name,
      await prisma.platformRole.upsert({
        where: { name },
        update: {},
        create: {
          id: randomUUID(),
          name,
        },
      }),
    ])
  );

  return Object.fromEntries(entries) as SeededPlatformRoles;
}

export async function seedCourseRoles({
  prisma,
}: SeedCourseRolesInput): Promise<SeededCourseRoles> {
  const entries = await Promise.all(
    COURSE_ROLE_NAMES.map(async (name: CourseRoleName) => [
      name,
      await prisma.courseRole.upsert({
        where: { name },
        update: {},
        create: {
          id: randomUUID(),
          name,
        },
      }),
    ])
  );

  return Object.fromEntries(entries) as SeededCourseRoles;
}
