import type { PlatformRoleName } from '@/generated/prisma';
import { auth } from '@/lib/auth';
import { emailService } from '@/lib/email-service';
import { prisma } from '@/lib/prisma';
import {
  createAvatarReadSignedUrl,
  isAbsoluteHttpUrl,
  isAvatarObjectKey,
} from '@/lib/storage/avatar';

export class UserService {
  private static async resolveAvatarImage(image: string | null) {
    if (!image) return null;

    if (isAbsoluteHttpUrl(image) || !isAvatarObjectKey(image)) return image;

    try {
      return await createAvatarReadSignedUrl({ objectKey: image });
    } catch (error) {
      console.error('Failed to create avatar signed URL:', error);
      return image;
    }
  }

  static async getBasicInfo(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const avatarUrl = await UserService.resolveAvatarImage(user.image);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role?.name ?? null,
      image: avatarUrl,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  static async getSecurityInfo(
    userId: string,
    userAgent: string | null | undefined
  ) {
    const accounts = await prisma.account.findMany({
      where: { userId },
      select: { providerId: true, password: true },
    });

    const hasPassword = accounts.some(
      (acc) => acc.password !== null && acc.password !== undefined
    );
    const primaryProvider =
      accounts.find((acc) => acc.providerId !== 'credential')?.providerId ??
      'credential';

    return {
      provider: primaryProvider,
      hasPassword,
      userAgent: userAgent ?? null,
    };
  }

  static async getProfileData(
    userId: string,
    userAgent: string | null | undefined
  ) {
    const [basicInfo, securityInfo] = await Promise.all([
      UserService.getBasicInfo(userId),
      UserService.getSecurityInfo(userId, userAgent),
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

  static async updateBasicInfo(userId: string, data: { name?: string }) {
    return await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
      },
    });
  }

  static async getAvatarPath(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { image: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user.image;
  }

  static async setAvatarPath(userId: string, avatarPath: string | null) {
    return await prisma.user.update({
      where: { id: userId },
      data: {
        image: avatarPath,
      },
      select: { image: true },
    });
  }

  static async setPassword(
    password: string,
    user: { name: string; email: string },
    headersList: Headers
  ) {
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }

    await auth.api.setPassword({
      body: {
        newPassword: password,
      },
      headers: headersList,
    });

    await emailService.sendPasswordChangedNotification({
      name: user.name,
      email: user.email,
    });
  }
}
