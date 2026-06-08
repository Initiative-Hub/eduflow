import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { StudyClient } from './_components/study-client';

export const metadata: Metadata = {
  title: 'Study Assistant',
};

export default async function StudyAssistantPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect('/login');
  }

  return <StudyClient />;
}
