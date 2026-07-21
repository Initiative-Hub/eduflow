import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getCoursePermissions } from '@/lib/permissions/course-permission';
import { COURSE_PERMISSION } from '@/lib/permissions/permission-keys';
import { AssignmentsClient } from './assignment-client';

export default async function AssignmentsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/login');
  }

  const permissions = await getCoursePermissions(session.user.id, courseId);

  if (permissions.withoutPermission(COURSE_PERMISSION.ASSESSMENTS_VIEW)) {
    notFound();
  }

  return (
    <AssignmentsClient
      courseId={courseId}
      canCreate={permissions.containPermission(
        COURSE_PERMISSION.ASSESSMENTS_CREATE
      )}
    />
  );
}
