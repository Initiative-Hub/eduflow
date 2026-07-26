import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getCoursePermissions } from '@/lib/permissions/course-permission';
import { COURSE_PERMISSION } from '@/lib/permissions/permission-keys';
import { CreateAssignmentClient } from './create-assignment-client';

export default async function CreateAssignmentPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  const sessionData = await auth.api.getSession({
    headers: await headers(),
  });

  if (!sessionData) {
    redirect('/login');
  }

  const permissions = await getCoursePermissions(sessionData.user.id, courseId);

  if (permissions.withoutPermission(COURSE_PERMISSION.ASSESSMENTS_CREATE)) {
    notFound();
  }

  return <CreateAssignmentClient courseId={courseId} />;
}
