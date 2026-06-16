import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
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
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect('/login');
  }

  try {
    const settings = await CourseSettingsService.getSettings(
      courseId,
      session.user.id
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
