import { prisma } from '@/lib/prisma';

export async function getCoursePermissions(roleId: string) {
  const permissions = await prisma.coursePermission.findMany({
    where: {
      courseRoleId: roleId,
      enabled: true,
    },
    select: {
      permission: true,
    },
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
