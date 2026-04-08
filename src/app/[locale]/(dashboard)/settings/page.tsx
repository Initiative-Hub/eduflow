import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Settings',
};

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect('/login');
  }

  return <section className="space-y-6">Setting pages</section>;
}
