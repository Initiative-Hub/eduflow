import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { PLATFORM_PERMISSION } from '@/lib/permissions/permission-keys';
import { getPlatformPermissions } from '@/lib/permissions/platform-permission';
import { AIClient } from './_components/ai-client';

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user?.id) {
    const permissions = await getPlatformPermissions(session.user.id);
    if (permissions.withoutPermission(PLATFORM_PERMISSION.AI_USE_CHAT)) {
      notFound();
    }
  }

  return (
    <AIClient
      isAuthenticated={Boolean(session?.user?.id)}
      userName={session?.user?.name}
    />
  );
}
