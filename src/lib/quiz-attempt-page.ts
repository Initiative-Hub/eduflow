import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import * as z from 'zod';
import { auth } from '@/lib/auth';
import { getCoursePermissions } from '@/lib/permissions/course-permission';
import { COURSE_PERMISSION } from '@/lib/permissions/permission-keys';
import { prisma } from '@/lib/prisma';

export async function requireQuizPage(courseId: string, quizId: string) {
  const parsed = z
    .object({
      courseId: z.uuid(),
      quizId: z.uuid(),
    })
    .safeParse({ courseId, quizId });
  if (!parsed.success) notFound();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
  const permissions = await getCoursePermissions(session.user.id, courseId);
  if (permissions.withoutPermission(COURSE_PERMISSION.ASSESSMENTS_VIEW))
    notFound();
  const quiz = await prisma.quiz.findFirst({
    where: { id: quizId, courseId },
    select: { id: true },
  });
  if (!quiz) notFound();
}
