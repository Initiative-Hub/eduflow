import {
  isPlatformPermissionKey,
  PLATFORM_PERMISSION_KEYS,
  type PlatformPermissionKey,
} from '@/lib/permissions/permission-keys';
import { prisma } from '@/lib/prisma';

type PlatformRoleWithPermissions = {
  name: string;
  permissions: Array<{
    permission: string;
    enabled: boolean;
  }>;
};

export type PlatformRolePermissionState = {
  role: string;
  permissions: Array<{
    permission: PlatformPermissionKey;
    enabled: boolean;
  }>;
};

export type UpdatePlatformRolePermissionInput = {
  role: string;
  permissions: Array<{
    permission: PlatformPermissionKey;
    enabled: boolean;
  }>;
};

export function buildPlatformRolePermissionStates(
  roles: PlatformRoleWithPermissions[]
): PlatformRolePermissionState[] {
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
    const permissions = rolePermissions.get(role);

    return {
      role,
      permissions: PLATFORM_PERMISSION_KEYS.map((permission) => ({
        permission,
        enabled: permissions?.get(permission) ?? false,
      })),
    };
  });
}

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

    return buildPlatformRolePermissionStates(roles);
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
