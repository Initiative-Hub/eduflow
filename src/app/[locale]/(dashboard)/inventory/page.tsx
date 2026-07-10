import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { PLATFORM_PERMISSION } from '@/lib/permissions/permission-keys';
import { InventoryClient } from './client';

export default async function InventoryPage() {
  const sessionData = await auth.api.getSession({ headers: await headers() });
  if (!sessionData) {
    redirect('/login');
  }

  if (
    !sessionData.user.permissions.includes(
      PLATFORM_PERMISSION.PERSONAL_FILES_MANAGE
    )
  ) {
    notFound();
  }

  return <InventoryClient />;
}
