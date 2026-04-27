import { prisma } from '@/lib/prisma';

export async function getPlatformRole(userId: string) {
  const userWithRole = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      role: true,
    },
  });

  return userWithRole?.role || null;
}
