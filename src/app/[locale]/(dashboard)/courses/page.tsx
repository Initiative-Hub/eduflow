import { PLATFORM_PERMISSION } from '@/lib/permissions/permission-keys';
import { getPlatformPermissions } from '@/lib/permissions/platform-permission';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { CoursesPageClient } from './_components/courses-page-client';

export default async function CoursesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const canCreateCourses = session?.user?.id
    ? (await getPlatformPermissions(session.user.id)).containPermission(
        PLATFORM_PERMISSION.COURSES_MANAGE
      )
    : false;

  return <CoursesPageClient canCreateCourses={canCreateCourses} />;
}
