import { prisma } from '@/lib/prisma';

export async function getCoursePermissions(userId: string, courseId: string) {
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      studentId: userId,
      courseId: courseId,
    },
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
    enrollment?.role.permissions.map((p) => p.permission as string) || [];

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
