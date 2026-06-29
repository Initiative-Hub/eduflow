import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { PLATFORM_PERMISSION } from '@/lib/permissions/permission-keys';
import { getPlatformPermissions } from '@/lib/permissions/platform-permission';
import WritingClient from './_components/writing-client';

export const metadata: Metadata = {
  title: 'Writing Assistant',
};

export default async function WritingAssistantPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user?.id) {
    const permissions = await getPlatformPermissions(session.user.id);
    if (permissions.withoutPermission(PLATFORM_PERMISSION.AI_USE_WRITING)) {
      notFound();
    }
  }

  return <WritingClient />;
}
