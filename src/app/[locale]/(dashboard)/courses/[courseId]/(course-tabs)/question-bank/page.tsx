import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getCoursePermissions } from '@/lib/permissions/course-permission';
import { COURSE_PERMISSION } from '@/lib/permissions/permission-keys';
import { QuestionBankClient } from './question-bank-client';

interface QuestionBankPageProps {
  params: Promise<{ courseId: string }>;
}

export default async function QuestionBankPage({
  params,
}: QuestionBankPageProps) {
  const { courseId } = await params;
  const sessionData = await auth.api.getSession({ headers: await headers() });
  if (!sessionData) redirect('/login');

  const coursePermissions = await getCoursePermissions(
    sessionData.user.id,
    courseId
  );
  if (
    [
      COURSE_PERMISSION.ASSESSMENTS_CREATE,
      COURSE_PERMISSION.ASSESSMENTS_UPDATE,
      COURSE_PERMISSION.ASSESSMENTS_DELETE,
    ].some(coursePermissions.withoutPermission)
  ) {
    notFound();
  }

  return <QuestionBankClient courseId={courseId} />;
}
