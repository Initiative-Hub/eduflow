import type { PlatformRoleName } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';

export class UserService {
  static async updateRole(userId: string, roleName: string) {
    const role = await prisma.platformRole.findUnique({
      where: { name: roleName as PlatformRoleName },
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
}
