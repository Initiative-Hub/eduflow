import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { SocraticClient } from './_components/socratic-client';

export const metadata: Metadata = {
  title: 'Socratic Tutor',
};

export default async function SocraticTutorPage() {
  const sessionData = await auth.api.getSession({ headers: await headers() });

  return <SocraticClient isAuthenticated={Boolean(sessionData)} />;
}
