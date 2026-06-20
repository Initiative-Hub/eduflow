import {
  COURSE_PERMISSION_KEYS,
  COURSE_ROLE_PERMISSION_DEFAULTS,
  PLATFORM_PERMISSION_KEYS,
  PLATFORM_ROLE_PERMISSION_DEFAULTS,
} from './data';
import type {
  SeedCoursePermissionsInput,
  SeedPlatformPermissionsInput,
} from './types';

export async function seedPlatformPermissions({
  prisma,
  platformRoles,
}: SeedPlatformPermissionsInput) {
  const permissions = Object.entries(platformRoles).flatMap(
    ([roleName, role]) => {
      const defaults = new Set(
        PLATFORM_ROLE_PERMISSION_DEFAULTS[
          roleName as keyof typeof PLATFORM_ROLE_PERMISSION_DEFAULTS
        ]
      );

      return PLATFORM_PERMISSION_KEYS.map((permission) => ({
        platformRoleId: role.id,
        permission,
        enabled: defaults.has(permission),
      }));
    }
  );

  await prisma.platformPermission.createMany({
    data: permissions,
    skipDuplicates: true,
  });

  return permissions.length;
}

export async function seedCoursePermissions({
  prisma,
  courseRoles,
}: SeedCoursePermissionsInput) {
  const courses = await prisma.course.findMany({ select: { id: true } });
  const permissions = courses.flatMap((course) =>
    Object.entries(courseRoles).flatMap(([roleName, role]) => {
      const defaults = new Set(
        COURSE_ROLE_PERMISSION_DEFAULTS[
          roleName as keyof typeof COURSE_ROLE_PERMISSION_DEFAULTS
        ]
      );

      return COURSE_PERMISSION_KEYS.map((permission) => ({
        courseId: course.id,
        courseRoleId: role.id,
        permission,
        enabled: defaults.has(permission),
      }));
    })
  );

  await prisma.coursePermission.createMany({
    data: permissions,
    skipDuplicates: true,
  });

  return permissions.length;
}
