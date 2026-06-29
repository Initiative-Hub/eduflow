import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { auth } from '@/lib/auth';
import { PLATFORM_PERMISSION } from '@/lib/permissions/permission-keys';
import { getPlatformPermissions } from '@/lib/permissions/platform-permission';

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    redirect('/login');
  }

  const permissions = await getPlatformPermissions(session.user.id);
  const hasAdminAccess = [
    PLATFORM_PERMISSION.USERS_VIEW,
    PLATFORM_PERMISSION.USERS_MANAGE,
    PLATFORM_PERMISSION.ROLES_VIEW,
    PLATFORM_PERMISSION.ROLES_MANAGE,
  ].some((permission) => permissions.containPermission(permission));

  if (!hasAdminAccess) {
    notFound();
  }

  return <>{children}</>;
}
