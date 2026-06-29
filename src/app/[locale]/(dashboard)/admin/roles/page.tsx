import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { PLATFORM_PERMISSION } from '@/lib/permissions/permission-keys';
import { getPlatformPermissions } from '@/lib/permissions/platform-permission';
import { RolesClient } from './client';

export const metadata: Metadata = {
  title: 'Roles',
};

export default async function AdminRolesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    redirect('/login');
  }

  const permissions = await getPlatformPermissions(session.user.id);
  if (permissions.withoutPermission(PLATFORM_PERMISSION.ROLES_VIEW)) {
    notFound();
  }

  return (
    <RolesClient
      canManageRoles={permissions.containPermission(
        PLATFORM_PERMISSION.ROLES_MANAGE
      )}
    />
  );
}
