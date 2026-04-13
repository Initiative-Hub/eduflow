import type { PlatformRoleName } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';

export class UserService {
  static async getBasicInfo(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role?.name ?? null,
      image: user.image ?? null,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  static async getSecurityInfo(
    userId: string,
    userAgent: string | null | undefined
  ) {
    const account = await prisma.account.findFirst({
      where: { userId },
      select: { providerId: true, password: true },
    });

    return {
      provider: account?.providerId ?? 'unknown',
      hasPassword:
        account?.password !== null && account?.password !== undefined,
      userAgent: userAgent ?? null,
    };
  }

  static async getProfileData(
    userId: string,
    userAgent: string | null | undefined
  ) {
    const [basicInfo, securityInfo] = await Promise.all([
      this.getBasicInfo(userId),
      this.getSecurityInfo(userId, userAgent),
    ]);

    return {
      basicInfo,
      securityInfo,
    };
  }

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
