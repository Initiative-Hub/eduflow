import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { PLATFORM_PERMISSION } from '@/lib/permissions/permission-keys';
import { getPlatformPermissions } from '@/lib/permissions/platform-permission';
import { InventoryClient } from './client';

export default async function InventoryPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    redirect('/login');
  }

  const permissions = await getPlatformPermissions(session.user.id);
  if (
    permissions.withoutPermission(PLATFORM_PERMISSION.PERSONAL_FILES_MANAGE)
  ) {
    notFound();
  }

  return <InventoryClient />;
}
