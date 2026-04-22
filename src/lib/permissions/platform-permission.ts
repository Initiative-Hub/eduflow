import { prisma } from '@/lib/prisma';

export async function getPlatformPermissions(roleId: string) {
  const permissions = await prisma.platformPermission.findMany({
    where: {
      platformRoleId: roleId,
      enabled: true,
    },
    select: {
      permission: true,
    },
    distinct: ['permission'],
  });

  const containPermission = (permission: string) =>
    permissions.some((p) => p.permission === permission);

  const withoutPermission = (permission: string) =>
    !permissions.some((p) => p.permission === permission);

  return {
    permissions: permissions.map(
      (permission) => permission.permission as string
    ),
    containPermission,
    withoutPermission,
  };
}
