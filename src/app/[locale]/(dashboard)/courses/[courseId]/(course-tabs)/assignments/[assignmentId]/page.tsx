import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getCoursePermissions } from '@/lib/permissions/course-permission';
import { COURSE_PERMISSION } from '@/lib/permissions/permission-keys';
import { AssignmentDetailsClient } from './assignment-details-client';

export default async function AssignmentPage({
  params,
}: {
  params: Promise<{
    courseId: string;
    assignmentId: string;
  }>;
}) {
  const { courseId, assignmentId } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) redirect('/login');

  const permissions = await getCoursePermissions(session.user.id, courseId);

  if (permissions.withoutPermission(COURSE_PERMISSION.ASSESSMENTS_VIEW)) {
    notFound();
  }

  return (
    <AssignmentDetailsClient courseId={courseId} assignmentId={assignmentId} />
  );
}
