import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
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

  const sessionData = await auth.api.getSession({ headers: requestHeaders });

  if (!sessionData) {
    redirect('/login');
  }

  const permissions = await getCoursePermissions(sessionData.user.id, courseId);

  if (permissions.withoutPermission(COURSE_PERMISSION.COURSE_CONTENT_VIEW)) {
    notFound();
  }

  return (
    <CourseModulesClient
      courseId={courseId}
      canCreateContent={permissions.containPermission(
        COURSE_PERMISSION.COURSE_CONTENT_CREATE
      )}
      canEditContent={permissions.containPermission(
        COURSE_PERMISSION.COURSE_CONTENT_UPDATE
      )}
      canDeleteContent={permissions.containPermission(
        COURSE_PERMISSION.COURSE_CONTENT_DELETE
      )}
      canUseCourseGenerationAI={permissions.containPermission(
        COURSE_PERMISSION.AI_USE_COURSE_GENERATION
      )}
      canCreateQuiz={permissions.containPermission(
        COURSE_PERMISSION.ASSESSMENTS_CREATE
      )}
    />
  );
}
