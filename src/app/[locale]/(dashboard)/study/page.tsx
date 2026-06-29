import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import type { Metadata } from 'next';
import { PLATFORM_PERMISSION } from '@/lib/permissions/permission-keys';
import { getPlatformPermissions } from '@/lib/permissions/platform-permission';
import { StudyClient } from './_components/study-client';

export const metadata: Metadata = {
  title: 'Study Assistant',
};

export default async function StudyAssistantPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    redirect('/login');
  }

  const permissions = await getPlatformPermissions(session.user.id);
  if (permissions.withoutPermission(PLATFORM_PERMISSION.AI_USE_STUDY)) {
    notFound();
  }

  return <StudyClient isAuthenticated />;
}
