import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getCoursePermissions } from '@/lib/permissions/course-permission';
import { COURSE_PERMISSION } from '@/lib/permissions/permission-keys';
import { QuizPlayerClient } from './quiz-player-client';

interface QuizPlayerPageProps {
  params: Promise<{ courseId: string; quizId: string }>;
}

export default async function QuizPlayerPage({ params }: QuizPlayerPageProps) {
  const { courseId, quizId } = await params;
  const sessionData = await auth.api.getSession({ headers: await headers() });
  if (!sessionData) redirect('/login');
  const coursePermissions = await getCoursePermissions(
    sessionData.user.id,
    courseId
  );
  if (coursePermissions.withoutPermission(COURSE_PERMISSION.ASSESSMENTS_VIEW)) {
    notFound();
  }

  return <QuizPlayerClient courseId={courseId} quizId={quizId} />;
}
