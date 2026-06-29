import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { PLATFORM_PERMISSION } from '@/lib/permissions/permission-keys';
import { RolesClient } from './client';

export const metadata: Metadata = {
  title: 'Roles',
};

export default async function AdminRolesPage() {
  const sessionData = await auth.api.getSession({ headers: await headers() });
  if (!sessionData) {
    redirect('/login');
  }

  if (!sessionData.user.permissions.includes(PLATFORM_PERMISSION.ROLES_VIEW)) {
    notFound();
  }

  return (
    <RolesClient
      canManageRoles={sessionData.user.permissions.includes(
        PLATFORM_PERMISSION.ROLES_MANAGE
      )}
    />
  );
}
