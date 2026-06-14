import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { getCoursePermissions } from '@/lib/permissions/course-permission';
import { COURSE_PERMISSION } from '@/lib/permissions/permission-keys';
import { MembersClient } from './client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('CourseMembersPage');
  return { title: t('title') };
}

export default async function MembersPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect('/login');
  }

  const permissions = await getCoursePermissions(session.user.id, courseId);

  if (permissions.withoutPermission(COURSE_PERMISSION.COURSE_MEMBERS_VIEW)) {
    notFound();
  }

  return (
    <MembersClient
      courseId={courseId}
      canManageMembers={permissions.containPermission(
        COURSE_PERMISSION.COURSE_MEMBERS_MANAGE
      )}
    />
  );
}
