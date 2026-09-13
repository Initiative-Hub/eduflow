import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import * as z from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getCoursePermissions } from '@/lib/permissions/course-permission';
import { COURSE_PERMISSION } from '@/lib/permissions/permission-keys';

export async function requireQuizPage(
  courseId: string,
  quizId: string,
  attemptId?: string
) {
  const parsed = z
    .object({
      courseId: z.uuid(),
      quizId: z.uuid(),
      attemptId: z.uuid().optional(),
    })
    .safeParse({ courseId, quizId, attemptId });
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
  if (
    attemptId &&
    !(await prisma.quizAttempt.findFirst({
      where: {
        id: attemptId,
        quizId,
        userId: session.user.id,
        status: 'COMPLETED',
      },
      select: { id: true },
    }))
  )
    notFound();
}
