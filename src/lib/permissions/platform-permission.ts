import { prisma } from '@/lib/prisma';

export async function getPlatformPermissions(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: {
        select: {
          permissions: {
            where: { enabled: true },
            select: { permission: true },
          },
        },
      },
    },
  });

  const permissionsList =
    user?.role?.permissions.map((p) => p.permission as string) || [];

  const containPermission = (permission: string) =>
    permissionsList.some((p) => p === permission);

  const withoutPermission = (permission: string) =>
    !permissionsList.some((p) => p === permission);

  return {
    permissions: permissionsList,
    containPermission,
    withoutPermission,
  };
}
