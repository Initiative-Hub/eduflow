import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { getCoursePermissions } from '@/lib/permissions/course-permission';
import { COURSE_PERMISSION } from '@/lib/permissions/permission-keys';
import { CourseSettingsService } from '@/services/CourseSettingsService';
import { CourseSettingsClient } from './client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('CourseSettingsPage');
  return { title: t('title') };
}

export default async function CourseSettingsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  const sessionData = await auth.api.getSession({ headers: await headers() });
  if (!sessionData) {
    redirect('/login');
  }

  const coursePermissions = await getCoursePermissions(
    sessionData.user.id,
    courseId
  );
  if (
    coursePermissions.withoutPermission(
      COURSE_PERMISSION.COURSE_SETTINGS_MANAGE
    )
  ) {
    notFound();
  }

  try {
    const settings = await CourseSettingsService.getSettings(
      courseId,
      sessionData.user.id
    );

    return (
      <CourseSettingsClient courseId={courseId} initialSettings={settings} />
    );
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === 'Course not found' || error.message === 'Forbidden')
    ) {
      notFound();
    }

    throw error;
  }
}
