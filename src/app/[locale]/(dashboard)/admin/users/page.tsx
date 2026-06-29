import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { PLATFORM_PERMISSION } from '@/lib/permissions/permission-keys';
import { getPlatformPermissions } from '@/lib/permissions/platform-permission';
import AdminUsersClient from './client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('AdminUsersPage');
  return { title: t('title') };
}

export default async function AdminUsersPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    redirect('/login');
  }

  const permissions = await getPlatformPermissions(session.user.id);
  if (permissions.withoutPermission(PLATFORM_PERMISSION.USERS_VIEW)) {
    notFound();
  }

  return (
    <AdminUsersClient
      canManageUsers={permissions.containPermission(
        PLATFORM_PERMISSION.USERS_MANAGE
      )}
    />
  );
}
