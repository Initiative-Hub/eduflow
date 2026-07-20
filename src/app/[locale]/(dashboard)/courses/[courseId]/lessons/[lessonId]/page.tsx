import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { getCoursePermissions } from '@/lib/permissions/course-permission';
import { COURSE_PERMISSION } from '@/lib/permissions/permission-keys';
import { LessonDetailsClient } from './lesson-details-client';

interface LessonDetailsPageProps {
  params: Promise<{ courseId: string; lessonId: string }>;
}

export default async function LessonDetailsPage({
  params,
}: LessonDetailsPageProps) {
  const [{ courseId, lessonId }, tH, tP, tV] = await Promise.all([
    params,
    getTranslations('Courses.LessonHeader'),
    getTranslations('Courses.LessonPage'),
    getTranslations('Courses.LessonView'),
  ]);
  const sessionData = await auth.api.getSession({ headers: await headers() });
  if (!sessionData) redirect('/login');
  const coursePermissions = await getCoursePermissions(
    sessionData.user.id,
    courseId
  );
  if (
    coursePermissions.withoutPermission(COURSE_PERMISSION.COURSE_CONTENT_VIEW)
  ) {
    notFound();
  }

  return (
    <LessonDetailsClient
      courseId={courseId}
      lessonId={lessonId}
      moduleFallbackTitle={tH('modules')}
      lessonFallbackTitle={tH('lesson')}
      notFoundLabel={tP('notFound')}
      emptyContentLabel={tV('empty')}
    />
  );
}
