import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { PLATFORM_PERMISSION } from '@/lib/permissions/permission-keys';
import WritingClient from './_components/writing-client';

export const metadata: Metadata = {
  title: 'Writing Assistant',
};

export default async function WritingAssistantPage() {
  const sessionData = await auth.api.getSession({ headers: await headers() });

  if (!sessionData) {
    redirect('/login');
  }

  if (
    !sessionData.user.permissions.includes(PLATFORM_PERMISSION.AI_USE_WRITING)
  ) {
    notFound();
  }

  return <WritingClient />;
}
