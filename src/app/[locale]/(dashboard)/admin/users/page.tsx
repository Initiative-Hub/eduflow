import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { PLATFORM_PERMISSION } from '@/lib/permissions/permission-keys';
import AdminUsersClient from './client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('AdminUsersPage');
  return { title: t('title') };
}

export default async function AdminUsersPage() {
  const sessionData = await auth.api.getSession({ headers: await headers() });
  if (!sessionData) {
    redirect('/login');
  }

  if (!sessionData.user.permissions.includes(PLATFORM_PERMISSION.USERS_VIEW)) {
    notFound();
  }

  return (
    <AdminUsersClient
      canManageUsers={sessionData.user.permissions.includes(
        PLATFORM_PERMISSION.USERS_MANAGE
      )}
    />
  );
}
