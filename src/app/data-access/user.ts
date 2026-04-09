import type { PlatformRoleName } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';

export async function updateUserRole(
  userId: string,
  roleName: PlatformRoleName
) {
  const role = await prisma.platformRole.findUnique({
    where: { name: roleName },
  });

  if (!role) {
    throw new Error(`Role ${roleName} not found`);
  }

  return await prisma.user.update({
    where: { id: userId },
    data: { roleId: role.id },
    include: { role: true },
  });
}
