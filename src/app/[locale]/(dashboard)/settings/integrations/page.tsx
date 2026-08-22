import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { auth } from '@/lib/auth';
import IntegrationsClient from './client';

export const metadata: Metadata = {
  title: 'Integrations',
};

export default async function IntegrationsPage() {
  const sessionData = await auth.api.getSession({ headers: await headers() });
  if (!sessionData) {
    redirect('/login');
  }

  return (
    <Suspense>
      <IntegrationsClient email={sessionData.user.email} />
    </Suspense>
  );
}
