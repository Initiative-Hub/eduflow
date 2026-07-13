import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { ComingSoon } from '@/components/layout/coming-soon';
import { auth } from '@/lib/auth';
import { getCoursePermissions } from '@/lib/permissions/course-permission';
import { COURSE_PERMISSION } from '@/lib/permissions/permission-keys';

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const sessionData = await auth.api.getSession({ headers: await headers() });
  if (!sessionData) redirect('/login');

  const permissions = await getCoursePermissions(sessionData.user.id, courseId);

  if (permissions.withoutPermission(COURSE_PERMISSION.COURSE_ANALYTICS_VIEW)) {
    notFound();
  }
  return <ComingSoon title="Analytics" backLabel="Return to Course" />;
}
