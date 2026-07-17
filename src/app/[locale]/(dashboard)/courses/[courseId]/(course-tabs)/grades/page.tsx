import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { GradesClient } from './grades-client';

interface GradesPageProps {
  params: Promise<{ courseId: string }>;
}

export default async function GradesPage({ params }: GradesPageProps) {
  const [{ courseId }, requestHeaders] = await Promise.all([params, headers()]);
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) redirect('/login');

  return <GradesClient courseId={courseId} />;
}
