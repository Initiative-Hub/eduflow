import type { PlatformRoleName } from '@/generated/prisma';
import {
  isPlatformPermissionKey,
  PLATFORM_PERMISSION_KEYS,
  type PlatformPermissionKey,
} from '@/lib/permissions/permission-keys';
import { prisma } from '@/lib/prisma';

export type PlatformRolePermissionState = {
  role: PlatformRoleName;
  permissions: Array<{
    permission: PlatformPermissionKey;
    enabled: boolean;
  }>;
};

export type UpdatePlatformRolePermissionInput = {
  role: PlatformRoleName;
  permissions: Array<{
    permission: PlatformPermissionKey;
    enabled: boolean;
  }>;
};

export class PlatformRolePermissionService {
  static async getPlatformRolePermissionStates() {
    const roles = await prisma.platformRole.findMany({
      where: {
        name: {
          in: ['ADMIN', 'TEACHER', 'STUDENT'],
        },
      },
      include: {
        permissions: {
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
            .filter(({ permission }) => isPlatformPermissionKey(permission))
            .map(({ permission, enabled }) => [permission, enabled])
        ),
      ])
    );

    return ['ADMIN', 'TEACHER', 'STUDENT'].map((role) => {
      const permissions = rolePermissions.get(role as PlatformRoleName);

      return {
        role: role as PlatformRoleName,
        permissions: PLATFORM_PERMISSION_KEYS.map((permission) => ({
          permission,
          enabled: permissions?.get(permission) ?? false,
        })),
      };
    });
  }

  static async updatePlatformRolePermissions({
    role,
    permissions,
  }: UpdatePlatformRolePermissionInput) {
    const platformRole = await prisma.platformRole.findUnique({
      where: { name: role as any },
      select: { id: true },
    });

    if (!platformRole) {
      throw new Error(`Platform role ${role} not found`);
    }

    return prisma.$transaction(
      permissions.map(({ permission, enabled }) =>
        prisma.platformPermission.upsert({
          where: {
            platformRoleId_permission: {
              platformRoleId: platformRole.id,
              permission,
            },
          },
          update: { enabled },
          create: {
            platformRoleId: platformRole.id,
            permission,
            enabled,
          },
        })
      )
    );
  }
}
