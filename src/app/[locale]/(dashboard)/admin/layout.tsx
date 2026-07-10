import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { auth } from '@/lib/auth';
import { PLATFORM_PERMISSION } from '@/lib/permissions/permission-keys';

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const sessionData = await auth.api.getSession({ headers: await headers() });
  if (!sessionData) {
    redirect('/login');
  }

  const hasAdminAccess = [
    PLATFORM_PERMISSION.USERS_VIEW,
    PLATFORM_PERMISSION.USERS_MANAGE,
    PLATFORM_PERMISSION.ROLES_VIEW,
    PLATFORM_PERMISSION.ROLES_MANAGE,
  ].some((permission) => sessionData.user.permissions.includes(permission));

  if (!hasAdminAccess) {
    notFound();
  }

  return <>{children}</>;
}
