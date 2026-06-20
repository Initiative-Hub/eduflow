import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getCoursePermissions } from '@/lib/permissions/course-permission';
import { COURSE_PERMISSION } from '@/lib/permissions/permission-keys';
import { CourseModulesClient } from './course-modules-client';

interface CourseModulesPageProps {
  params: Promise<{ courseId: string }>;
}

export default async function CourseModulesPage({
  params,
}: CourseModulesPageProps) {
  const [{ courseId }, requestHeaders] = await Promise.all([params, headers()]);

  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) {
    redirect('/login');
  }

  const permissions = await getCoursePermissions(session.user.id, courseId);

  return (
    <CourseModulesClient
      courseId={courseId}
      canDeleteContent={permissions.containPermission(
        COURSE_PERMISSION.COURSE_CONTENT_DELETE
      )}
    />
  );
}
