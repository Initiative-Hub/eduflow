import { prisma } from '@/lib/prisma';

export async function getCourseRole(userId: string, courseId: string) {
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      studentId: userId,
      courseId: courseId,
    },
    select: {
      role: true,
    },
  });

  return enrollment?.role || null;
}
