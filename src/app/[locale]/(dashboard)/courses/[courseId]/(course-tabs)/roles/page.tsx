import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getCoursePermissions } from '@/lib/permissions/course-permission';
import { COURSE_PERMISSION } from '@/lib/permissions/permission-keys';
import { RolesClient } from './client';

export const metadata: Metadata = {
  title: 'Course Roles',
};

export default async function CourseRolesPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const sessionData = await auth.api.getSession({ headers: await headers() });
  if (!sessionData) redirect('/login');
  const coursePermissions = await getCoursePermissions(
    sessionData.user.id,
    courseId
  );
  if (
    coursePermissions.withoutPermission(COURSE_PERMISSION.COURSE_ROLES_MANAGE)
  ) {
    notFound();
  }
  return <RolesClient courseId={courseId} />;
}
