import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getCoursePermissions } from '@/lib/permissions/course-permission';
import { COURSE_PERMISSION } from '@/lib/permissions/permission-keys';
import { CreateQuizClient } from './create-quiz-client';

interface CreateQuizPageProps {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ moduleId?: string; lessonId?: string }>;
}

export default async function CreateQuizPage({
  params,
  searchParams,
}: CreateQuizPageProps) {
  const { courseId } = await params;
  const { moduleId, lessonId } = await searchParams;

  const sessionData = await auth.api.getSession({ headers: await headers() });
  if (!sessionData) redirect('/login');
  const coursePermissions = await getCoursePermissions(
    sessionData.user.id,
    courseId
  );
  if (
    coursePermissions.withoutPermission(COURSE_PERMISSION.ASSESSMENTS_CREATE)
  ) {
    notFound();
  }

  return (
    <CreateQuizClient
      courseId={courseId}
      preselectedModuleId={moduleId}
      lessonId={lessonId}
    />
  );
}
