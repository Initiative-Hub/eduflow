import { prisma } from '@/lib/prisma';

export async function getCourseRole(userId: string, courseId: string) {
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      memberId: userId,
      courseId,
      course: { deletedAt: null },
    },
    select: {
      role: true,
    },
  });

  return enrollment?.role || null;
}
