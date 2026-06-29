import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { PLATFORM_PERMISSION } from '@/lib/permissions/permission-keys';
import { CoursesPageClient } from './_components/courses-page-client';

export default async function CoursesPage() {
  const sessionData = await auth.api.getSession({ headers: await headers() });

  return (
    <CoursesPageClient
      canCreateCourses={Boolean(
        sessionData?.user.permissions.includes(
          PLATFORM_PERMISSION.COURSES_MANAGE
        )
      )}
    />
  );
}
