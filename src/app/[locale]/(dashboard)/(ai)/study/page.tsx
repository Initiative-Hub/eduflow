import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { StudyClient } from './_components/study-client';

export const metadata: Metadata = {
  title: 'Study Assistant',
};

export default async function StudyAssistantPage() {
  const sessionData = await auth.api.getSession({ headers: await headers() });

  return <StudyClient isAuthenticated={Boolean(sessionData)} />;
}
