import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { PLATFORM_PERMISSION } from '@/lib/permissions/permission-keys';
import { getPlatformPermissions } from '@/lib/permissions/platform-permission';
import { SocraticClient } from './_components/socratic-client';

export const metadata: Metadata = {
  title: 'Socratic Tutor',
};

export default async function SocraticTutorPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user?.id) {
    const permissions = await getPlatformPermissions(session.user.id);
    if (permissions.withoutPermission(PLATFORM_PERMISSION.AI_USE_SOCRATIC)) {
      notFound();
    }
  }

  return <SocraticClient isAuthenticated={Boolean(session)} />;
}
