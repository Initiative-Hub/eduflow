import type { CourseRoleName } from '@/generated/prisma';
import {
  COURSE_PERMISSION,
  COURSE_PERMISSION_KEYS,
  type CoursePermissionKey,
  isCoursePermissionKey,
} from '@/lib/permissions/permission-keys';
import { prisma } from '@/lib/prisma';

export type CourseRolePermissionState = {
  role: CourseRoleName;
  permissions: Array<{
    permission: CoursePermissionKey;
    enabled: boolean;
  }>;
};

export type UpdateCourseRolePermissionInput = {
  courseId: string;
  role: CourseRoleName;
  permissions: Array<{
    permission: CoursePermissionKey;
    enabled: boolean;
  }>;
};

export class CourseRolePermissionService {
  static async getCourseRolePermissionStates(courseId: string) {
    const roles = await prisma.courseRole.findMany({
      where: {
        name: {
          in: ['COURSE_OWNER', 'TEACHER', 'STUDENT'],
        },
      },
      include: {
        permissions: {
          where: { courseId },
          select: {
            permission: true,
            enabled: true,
          },
        },
      },
    });

    const rolePermissions = new Map(
      roles.map((role) => [
        role.name,
        new Map(
          role.permissions
            .filter(({ permission }) => isCoursePermissionKey(permission))
            .map(({ permission, enabled }) => [permission, enabled])
        ),
      ])
    );

    return ['COURSE_OWNER', 'TEACHER', 'STUDENT'].map((role) => {
      const permissions = rolePermissions.get(role as CourseRoleName);

      return {
        role: role as CourseRoleName,
        permissions: COURSE_PERMISSION_KEYS.map((permission) => ({
          permission,
          enabled: permissions?.get(permission) ?? false,
        })),
      };
    });
  }

  static async updateCourseRolePermissions({
    courseId,
    role,
    permissions,
  }: UpdateCourseRolePermissionInput) {
    const courseRole = await prisma.courseRole.findUnique({
      where: { name: role },
      select: { id: true },
    });

    if (!courseRole) {
      throw new Error(`Course role ${role} not found`);
    }

    return prisma.$transaction(
      permissions.map(({ permission, enabled }) =>
        prisma.coursePermission.upsert({
          where: {
            courseId_courseRoleId_permission: {
              courseId,
              courseRoleId: courseRole.id,
              permission,
            },
          },
          update: { enabled },
          create: {
            courseId,
            courseRoleId: courseRole.id,
            permission,
            enabled,
          },
        })
      )
    );
  }
}
